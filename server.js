const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');
const { execSync } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI client pointing to NVIDIA NIM
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// ── CHAT ENDPOINT (Optimized for Speed) ──
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const response = await openai.chat.completions.create({
      model: 'meta/llama-3.1-8b-instruct', // Blazing fast model
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: 'Failed to communicate with Chat model' });
  }
});

// Productivity Endpoint (using raw fetch for custom params like reasoning_effort)
app.post('/api/productivity', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_PROD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "mistralai/mistral-small-4-119b-2603",
        reasoning_effort: "high",
        messages: messages,
        temperature: 0.10,
        max_tokens: 16384,
        top_p: 1.00,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.status}`);
    }

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error('Prod API Error:', error);
    res.status(500).json({ error: 'Failed to communicate with Productivity model' });
  }
});

// ── IN-MEMORY VECTOR STORE FOR RAG ──
let documentEmbeddings = [];

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── RESEARCH ENDPOINTS ──

// 1. Ingest Document (Enhanced Sliding Window Chunking)
app.post('/api/research/ingest', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    // Sliding Window Chunking: 600 chars with 150 overlap
    const windowSize = 600;
    const overlap = 150;
    const chunks = [];
    
    for (let i = 0; i < text.length; i += (windowSize - overlap)) {
      const chunk = text.substring(i, i + windowSize).trim();
      if (chunk.length > 50) chunks.push(chunk);
      if (i + windowSize >= text.length) break;
    }

    if (chunks.length === 0) return res.json({ success: true, chunks: 0 });

    const response = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_EMBED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: chunks,
        model: "baai/bge-m3",
        encoding_format: "float"
      })
    });

    if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
    const data = await response.json();
    
    // Reset our memory store for simplicity
    documentEmbeddings = []; 
    data.data.forEach((item, index) => {
      documentEmbeddings.push({
        text: chunks[index],
        embedding: item.embedding
      });
    });

    res.json({ success: true, chunks: documentEmbeddings.length });
  } catch (err) {
    console.error('Ingest Error:', err);
    res.status(500).json({ error: 'Failed to ingest document.' });
  }
});

// 2. Query Document / General Research
app.post('/api/research', async (req, res) => {
  try {
    const { prompt, useIngested } = req.body;
    
    // If we have an ingested document and the user wants to use it
    if (useIngested && documentEmbeddings.length > 0) {
      // Embed the query
      const embedRes = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NVIDIA_EMBED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: [prompt],
          model: "baai/bge-m3",
          encoding_format: "float"
        })
      });
      
      if (!embedRes.ok) throw new Error('Query Embedding Failed');
      const embedData = await embedRes.json();
      const queryVector = embedData.data[0].embedding;

      // Calculate similarity
      const scoredChunks = documentEmbeddings.map(doc => ({
        text: doc.text,
        score: cosineSimilarity(queryVector, doc.embedding)
      }));

      scoredChunks.sort((a, b) => b.score - a.score);
      const topChunks = scoredChunks.slice(0, 3).map(c => c.text);
      const context = topChunks.join('\n\n');

      // Ask Mistral Productivity Model
      const messages = [
        { role: 'system', content: `You are an expert Research AI. Analyze the provided Source Context deeply. Provide a detailed summary, key facts, and answer the user's specific question based on this data. If the info is missing, say so.\n\nSource Context:\n${context}` },
        { role: 'user', content: prompt }
      ];

      const modelRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NVIDIA_PROD_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "mistralai/mistral-small-4-119b-2603",
          reasoning_effort: "low",
          messages: messages,
          temperature: 0.10,
          max_tokens: 2048,
          stream: false
        })
      });

      if (!modelRes.ok) throw new Error('Mistral Model Failed');
      const data = await modelRes.json();
      return res.json({ reply: data.choices[0].message.content });
    }

    // fallback to general research if no document or not requested
    const completion = await openai.chat.completions.create({
      model: "meta/llama3-70b-instruct",
      messages: [{ role: 'system', content: 'You are an advanced Research Assistant. Provide detailed, factual, and well-cited information.' }, { role:'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1536,
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('Research Query Error:', err);
    res.status(500).json({ error: 'Failed to process research query.' });
  }
});

// Image Generation Endpoint (using fetch for raw API base64 handling)
app.post('/api/image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await fetch('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        seed: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image API Error Response:', errorText);
      throw new Error(`NVIDIA API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.data && data.data[0] && data.data[0].b64_json) {
      res.json({ base64: data.data[0].b64_json });
    } else if (data.artifacts && data.artifacts.length > 0) {
      res.json({ base64: data.artifacts[0].base64 });
    } else {
      console.log('Unexpected format:', data);
      throw new Error('Unexpected response format from Image API');
    }

  } catch (error) {
    console.error('Image API Error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// ── Creative AI Endpoint (Kimi K2.5 — Video/Music/Specialized Text Tools) ──
// Uses moonshotai/kimi-k2.5 with thinking mode for creative generation tasks
const CREATIVE_SYSTEM_PROMPTS = {
  // Video AI Tools
  'script':       'You are an expert video scriptwriter. Write compelling, well-structured scripts with clear scene direction, dialogue, and pacing. Format with clear sections.',
  'scene':        'You are a professional director and storyboard artist. Break down the provided concept into detailed shot-by-shot scene descriptions with camera angles, lighting, and action notes.',
  'summarize':    'You are a video content analyst. Summarize the provided video transcript or description clearly and concisely, extracting key points and insights.',
  'hook':         'You are a viral content strategist. Write 5 powerful, attention-grabbing video hooks/intros for the described content. Each should be under 15 seconds when spoken.',
  // Music AI Tools
  'lyrics':       'You are an award-winning songwriter. Write creative, emotionally resonant song lyrics with verse/chorus/bridge structure for the described style or theme.',
  'music_prompt': 'You are an AI music prompt engineer. Generate 3 highly detailed, optimized text prompts for Suno/Udio AI music generators to create tracks matching the described style.',
  'song_analyze': 'You are a music theorist and critic. Analyze the described song or musical concept covering mood, structure, themes, influences, and emotional impact.',
  'artist_bio':   'You are a music industry publicist. Create a compelling, unique artist biography and persona based on the described style, including name suggestions, backstory, and sound description.',
  // Specialized Tools
  'recipe':       'You are a professional chef and nutritionist. Create a detailed recipe from the listed ingredients, including prep time, cook time, nutritional info, and step-by-step instructions.',
  'workout':      'You are a certified personal trainer. Create a detailed, personalized workout plan based on the user\'s goals, fitness level, and available equipment.',
  'travel':       'You are an expert travel planner. Create a detailed day-by-day itinerary for the described destination, including must-see spots, local food, transport tips, and budget estimates.',
  'dream':        'You are a dream psychologist and symbolism expert. Interpret the described dream using psychological and symbolic frameworks, explaining possible meanings and connections to waking life.',
  'scam':         'You are a cybersecurity expert and fraud analyst. Analyze the provided message or content for scam indicators, red flags, and manipulation tactics. Give a clear verdict.',
  'mood':         'You are an emotionally intelligent AI companion. Adapt your response style and content to match and uplift the user\'s described mood. Be warm, creative, and helpful.',
  'rewrite':      'You are a professional editor and writing coach. Rewrite the provided text in the requested tone or style while preserving the core message. Offer 2-3 variations.',
  'email':        'You are an expert business writer. Compose a professional, clear, and effective email based on the provided context. Include subject line and proper formatting.',
};

app.post('/api/creative', async (req, res) => {
  try {
    const { prompt, mode } = req.body;
    if (!prompt || !mode) {
      return res.status(400).json({ error: 'Prompt and mode are required' });
    }

    const systemPrompt = CREATIVE_SYSTEM_PROMPTS[mode] || 'You are a helpful creative AI assistant.';

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_CREATIVE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
        temperature: 1.0,
        top_p: 1.0,
        stream: false,
        chat_template_kwargs: { thinking: true },
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Creative API Error:', errText);
      throw new Error(`Creative API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';
    res.json({ reply });

  } catch (error) {
    console.error('Creative API Error:', error);
    res.status(500).json({ error: `Creative AI failed: ${error.message}` });
  }
});

// ── Music AI Endpoint (Free Jiosaavn API) ──
app.get('/api/music/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query is required' });

    const response = await axios.get(`https://saavn.me/search/songs?query=${encodeURIComponent(q)}&limit=15`);
    const results = response.data.data.results.map(song => ({
      id: song.id,
      title: song.name,
      artist: song.primaryArtists,
      album: song.album.name,
      audio_url: song.downloadUrl.find(d => d.quality === '320kbps')?.link || song.downloadUrl[song.downloadUrl.length - 1].link,
      thumbnail: song.image.find(i => i.quality === '500x500')?.link || song.image[0].link,
      duration: song.duration,
      youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(song.name + ' ' + song.primaryArtists)}`
    }));

    res.json(results);
  } catch (error) {
    console.error('Music Search Error:', error);
    res.status(500).json({ error: 'Failed to search music' });
  }
});

// ── Video Toolkit Endpoint (YouTube Transcript) ──
app.post('/api/video/transcript', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Extract Video ID
    const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n<]+)/);
    if (!videoIdMatch) return res.status(400).json({ error: 'Invalid YouTube URL' });
    const videoId = videoIdMatch[1];

    // Using Python bridge for more reliable transcript extraction (avoids Node ESM/CJS mess)
    const pythonScript = `
import sys
from youtube_transcript_api import YouTubeTranscriptApi
try:
    transcript = YouTubeTranscriptApi.get_transcript("${videoId}")
    print(" ".join([t["text"] for t in transcript]))
except Exception as e:
    print(f"ERROR: {str(e)}")
`;
    // Running python script via shell
    const transcript = execSync(`python -c "${pythonScript.replace(/"/g, '\\"')}"`).toString().trim();
    
    if (transcript.startsWith('ERROR:')) {
      throw new Error(transcript);
    }

    res.json({ transcript, videoId });
  } catch (error) {
    console.error('Transcript Error:', error);
    res.status(500).json({ error: 'Failed to extract transcript. Ensure video has captions.' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
