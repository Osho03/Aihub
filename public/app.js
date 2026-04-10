// ═══════════════════════════════════════════════════
//  AIHUB — app.js  (All modal logic & API calls)
// ═══════════════════════════════════════════════════

// ── DOM refs ──
const chatModal   = document.getElementById('chatModal');
const imageModal  = document.getElementById('imageModal');
const chatFeed    = document.getElementById('chatFeed');
const chatInput   = document.getElementById('chatInput');
const imageInput  = document.getElementById('imageInput');
const prodInput   = document.getElementById('prodInput');

const generatedImage  = document.getElementById('generatedImage');
const imageLoader     = document.getElementById('imageLoader');
const imageEmptyDiv   = document.getElementById('imageEmptyState');

const researchModal   = document.getElementById('researchModal');
const researchInput   = document.getElementById('researchInput');
const researchFeed    = document.getElementById('researchFeed');
const researchFileName = document.getElementById('researchFileName');
const researchFileInput = document.getElementById('researchFileInput');

// ── Conversation histories ──
let chatHistory = [
  { role: 'system', content: 'You are AIHUB, a helpful, advanced, and sleek AI assistant running inside a premium application. Be concise, smart, and friendly.' }
];
let prodHistory = [
  { role: 'system', content: 'You are an advanced Productivity and Code Assistant. Use high reasoning effort and provide precise, complete code solutions.' }
];
let researchHistory = [
  { role: 'system', content: 'You are an AI Research Assistant. You analyze provided documents or text files and provide summarized, detailed insights. Always mention the source if provided.' }
];
let documentIngested = false;
let currentResearchFileText = "";

// ── LocalStorage Keys ──
const FAV_KEY = 'aihub_favorites';
const RECENT_KEY = 'aihub_recent';

// ── Initialize Favorites & History from LocalStorage ──
let favorites = JSON.parse(localStorage.getItem(FAV_KEY)) || [];
let recentHistory = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];

// ── Current Video/Music tab modes ──
let currentVideoMode = 'script';
let currentMusicMode = 'lyrics';

// ── Theme State ──
const THEME_KEY = 'aihub_theme';
let isLightTheme = localStorage.getItem(THEME_KEY) === 'light';

// ── Voice State ──
let femaleVoice = null;

// ════════════════════════════════════
//  THEME SYSTEM
// ════════════════════════════════════
function initTheme() {
  if (isLightTheme) {
    document.body.classList.add('light-theme');
    document.getElementById('themeIco').textContent = '☀️';
  }
}

function toggleTheme() {
  isLightTheme = !isLightTheme;
  if (isLightTheme) {
    document.body.classList.add('light-theme');
    document.getElementById('themeIco').textContent = '☀️';
    localStorage.setItem(THEME_KEY, 'light');
    showToast('☀️ Light mode active');
  } else {
    document.body.classList.remove('light-theme');
    document.getElementById('themeIco').textContent = '🌙';
    localStorage.setItem(THEME_KEY, 'dark');
    showToast('🌙 Dark mode active');
  }
}

// ════════════════════════════════════
//  AI VOICE (TTS)
// ════════════════════════════════════
function initVoices() {
  const voices = window.speechSynthesis.getVoices();
  // Smart selection: Look for 'Natural', 'Female', 'Google', or 'Premium' in name
  femaleVoice = voices.find(v => 
    (v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('English (US)')) 
    && v.lang.startsWith('en')
  ) || voices.find(v => v.lang.startsWith('en'));
}
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = initVoices;
}

function speakText(text) {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Strip HTML tags for speaking
  const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
  const utterance = new SpeechSynthesisUtterance(cleanText);
  if (femaleVoice) utterance.voice = femaleVoice;
  utterance.pitch = 1.0;
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ════════════════════════════════════
//  MODAL OPEN / CLOSE
// ════════════════════════════════════
function openChatModal()  { chatModal.classList.add('active');  setTimeout(() => chatInput.focus(), 300); }
function closeChatModal() { chatModal.classList.remove('active'); }

function openImageModal()  { imageModal.classList.add('active'); setTimeout(() => imageInput.focus(), 300); }
function closeImageModal() { imageModal.classList.remove('active'); }

function openVideoModal() {
  document.getElementById('videoModal').classList.add('active');
  setTimeout(() => {
    const ytInput = document.getElementById('ytUrlInput');
    if (ytInput) ytInput.focus();
  }, 300);
}
function closeVideoModal() { document.getElementById('videoModal').classList.remove('active'); }

function openMusicModal() {
  document.getElementById('musicModal').classList.add('active');
  setTimeout(() => {
    const mSearch = document.getElementById('musicSearchInput');
    if (mSearch) mSearch.focus();
  }, 300);
}
function closeMusicModal() { document.getElementById('musicModal').classList.remove('active'); }

function switchMusicTool(mode) {
  const tabs = document.querySelectorAll('.mtab');
  tabs.forEach(t => t.classList.toggle('active', t.getAttribute('onclick')?.includes(mode)));
  
  const hints = {
    'lyrics': '🎵 Lyric Writer — Write original song lyrics',
    'music_prompt': '🎼 Music Prompter — Generate Suno/Udio prompts'
  };
  
  const feed = document.getElementById('musicFeed');
  feed.innerHTML = `<div class="chat-bubble ai">${hints[mode] || 'How can I help with your music?'}</div>`;
}

function openProdModal() {
  document.getElementById('prodModal').classList.add('active');
  setTimeout(() => prodInput.focus(), 300);
}
function closeProdModal() { document.getElementById('prodModal').classList.remove('active'); }

function openResearchModal() {
  researchModal.classList.add('active');
  setTimeout(() => researchInput.focus(), 300);
}
function closeResearchModal() { researchModal.classList.remove('active'); }

function openSpecModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeSpecModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ════════════════════════════════════
//  ROUTING — openTool() override
// ════════════════════════════════════
const _baseOpenTool = window.openTool; // defined in index.html inline script
window.openTool = function(name, icon) {
  if (_baseOpenTool) _baseOpenTool(name, icon);
  routeToModal(name);
};

function routeToModal(name) {
  const textTools  = ['AI Chatbot','Summarizer','Text AI','Rewriter','Email Composer'];
  const imageTools = ['Image Generator','Image AI'];
  const videoTools = ['Video AI','Video Generator','Script Writer','Scene Planner','Hook Generator','Video Summarizer'];
  const musicTools = ['Music AI','Music & Voice','Music Composer','Voice Clone','Lyric Writer','Music Prompter'];
  const prodTools  = ['Productivity','Data Analyst','Productivity AI','Research AI'];
  const specMap    = {
    'Recipe Generator': 'recipeModal',
    'Workout Planner':  'workoutModal',
    'Travel Planner':   'travelModal',
    'Dream Interpreter':'dreamModal',
    'Scam Detector':    'scamModal',
    'Lie Detector':     'scamModal',
    'Mood AI':          'moodModal',
  };

  if (textTools.includes(name))  return openChatModal();
  if (imageTools.includes(name)) return openImageModal();
  if (videoTools.includes(name)) return openVideoModal();
  if (musicTools.includes(name)) return openMusicModal();
  if (name === 'Research AI')    return openResearchModal();
  if (prodTools.includes(name))  return openProdModal();
  if (specMap[name])             return openSpecModal(specMap[name]);
}

// Bottom bar "Open Tool" — handled via inline onclick in index.html

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// ════════════════════════════════════
//  VIDEO AI — Tabbed text tools
// ════════════════════════════════════
function setVideoTab(el, mode, hint, placeholder) {
  document.querySelectorAll('.vtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  currentVideoMode = mode;
  document.getElementById('videoTabHint').textContent = hint;
  document.getElementById('videoInput').placeholder = placeholder;
}

async function sendVideoCreative() {
  const input = document.getElementById('videoInput');
  const feed  = document.getElementById('videoFeed');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  addFeedMessage(feed, text, true);
  const typingId = addTypingIndicator(feed, '#22c55e');

  try {
    const res = await fetch('/api/creative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, mode: currentVideoMode })
    });
    removeTyping(feed, typingId);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    addFeedMessage(feed, data.reply || 'No response.', false, true);
  } catch (err) {
    removeTyping(feed, typingId);
    addFeedMessage(feed, '⚠️ Error: ' + err.message, false);
  }
}

document.getElementById('videoInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendVideoCreative(); }
});

// ════════════════════════════════════
//  MUSIC AI — Tabbed text tools
// ════════════════════════════════════
function setMusicTab(el, mode, hint, placeholder) {
  document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  currentMusicMode = mode;
  document.getElementById('musicTabHint').textContent = hint;
  document.getElementById('musicInput').placeholder = placeholder;
}

async function sendMusicCreative() {
  const input = document.getElementById('musicInput');
  const feed  = document.getElementById('musicFeed');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  addFeedMessage(feed, text, true);
  const typingId = addTypingIndicator(feed, '#ec4899');

  try {
    const res = await fetch('/api/creative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, mode: currentMusicMode })
    });
    removeTyping(feed, typingId);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    addFeedMessage(feed, data.reply || 'No response.', false, true);
  } catch (err) {
    removeTyping(feed, typingId);
    addFeedMessage(feed, '⚠️ Error: ' + err.message, false);
  }
}

document.getElementById('musicInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMusicCreative(); }
});

// ════════════════════════════════════
//  SPECIALIZED TOOLS (shared handler)
// ════════════════════════════════════
async function sendSpecialized(mode, inputId, feedId) {
  const input = document.getElementById(inputId);
  const feed  = document.getElementById(feedId);
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  addFeedMessage(feed, text, true);
  const typingId = addTypingIndicator(feed);

  try {
    const res = await fetch('/api/creative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, mode })
    });
    removeTyping(feed, typingId);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    addFeedMessage(feed, data.reply || 'No response.', false, true);
  } catch (err) {
    removeTyping(feed, typingId);
    addFeedMessage(feed, '⚠️ Error: ' + err.message, false);
  }
}

// Wire Enter keys for specialized inputs
['recipeInput','workoutInput','travelInput','dreamInput','scamInput','moodInput'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el.closest('.modal-content').querySelector('.send-btn').click();
    }
  });
  el.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });
});

// ════════════════════════════════════
//  SHARED FEED HELPERS
// ════════════════════════════════════
function formatAIReply(text) {
  // Simple bold: **text** -> <strong>text</strong>
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Simple newlines
  html = html.replace(/\n/g, '<br>');
  // Simple links: URLs -> <a> tags
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  html = html.replace(urlRegex, (url) => `<a href="${url}" target="_blank">${url}</a>`);
  return html;
}

function addFeedMessage(feed, text, isUser = false, isCreative = false) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isUser ? 'user' : 'ai'}${isCreative ? ' creative' : ''}`;
  if (isUser) {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = formatAIReply(text);
    // Add speak button
    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.innerHTML = '🔊';
    speakBtn.onclick = (e) => {
      e.stopPropagation();
      speakText(text);
    };
    bubble.appendChild(speakBtn);
  }
  feed.appendChild(bubble);
  feed.scrollTop = feed.scrollHeight;
  return bubble;
}

let _typingCounter = 0;
function addTypingIndicator(feed, color = '#7c5cfc') {
  const id = 'typing_' + (++_typingCounter);
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai typing-bubble';
  bubble.id = id;
  bubble.style.borderColor = color + '30';
  bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
  feed.appendChild(bubble);
  feed.scrollTop = feed.scrollHeight;
  return id;
}

function removeTyping(feed, id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ════════════════════════════════════
//  CHAT AI
// ════════════════════════════════════
function addMessage(text, isUser = false) {
  addFeedMessage(chatFeed, text, isUser);
}

function showTyping() {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai typing-bubble';
  bubble.id = 'typingBubble';
  bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
  chatFeed.appendChild(bubble);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function hideTyping() {
  const tb = document.getElementById('typingBubble');
  if (tb) tb.remove();
}

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  addMessage(text, true);
  chatInput.value = '';
  chatInput.style.height = 'auto';
  chatHistory.push({ role: 'user', content: text });
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    hideTyping();
    if (data.reply) {
      addMessage(data.reply, false);
      chatHistory.push({ role: 'assistant', content: data.reply });
    } else {
      addMessage('Error: No response from AI model.', false);
    }
  } catch (err) {
    hideTyping();
    addMessage('⚠️ Connection failed. Check if server is running.', false);
  }
}

chatInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
});

// ════════════════════════════════════
//  PRODUCTIVITY / CODE AI
// ════════════════════════════════════
function addProdMessage(text, isUser = false) {
  const prodFeed = document.getElementById('prodFeed');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isUser ? 'user' : 'ai'}`;
  if (isUser) {
    bubble.style.background = 'linear-gradient(135deg, #22c55e, #10b981)';
    bubble.textContent = text;
  } else {
    bubble.style.borderColor = 'rgba(34,197,94,0.2)';
    bubble.style.fontFamily = 'monospace';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.style.background = 'rgba(25,25,30,0.9)';
    bubble.innerHTML = formatAIReply(text);
    
    // Add speak button
    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.innerHTML = '🔊';
    speakBtn.onclick = (e) => {
      e.stopPropagation();
      speakText(text);
    };
    bubble.appendChild(speakBtn);
  }
  prodFeed.appendChild(bubble);
  prodFeed.scrollTop = prodFeed.scrollHeight;
}

function showProdTyping() {
  const prodFeed = document.getElementById('prodFeed');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai typing-bubble';
  bubble.id = 'prodTypingBubble';
  bubble.style.borderColor = 'rgba(34,197,94,0.2)';
  bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
  prodFeed.appendChild(bubble);
  prodFeed.scrollTop = prodFeed.scrollHeight;
}

function hideProdTyping() {
  const tb = document.getElementById('prodTypingBubble');
  if (tb) tb.remove();
}

async function ingestDocument() {
  const text = document.getElementById('ingestInput').value.trim();
  if (!text) return;
  addProdMessage('Ingesting reference document...', true);
  showProdTyping();

  try {
    const res = await fetch('/api/research/ingest', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error('Ingest failed');
    const data = await res.json();
    hideProdTyping();
    if (data.success) {
      documentIngested = true;
      document.getElementById('ingestInput').value = '';
      addProdMessage(`✅ Document ingested! ${data.chunks} chunks embedded. You can now query from this document.`, false);
    } else {
      addProdMessage('Failed to ingest.', false);
    }
  } catch (err) {
    hideProdTyping();
    addProdMessage('⚠️ Failed to ingest document. Check embedding API key.', false);
  }
}

async function sendProdMessage() {
  const text = prodInput.value.trim();
  if (!text) return;
  addProdMessage(text, true);
  prodInput.value = '';
  prodInput.style.height = 'auto';
  prodHistory.push({ role: 'user', content: text });
  showProdTyping();

  try {
    const endpoint = documentIngested ? '/api/research/query' : '/api/productivity';
    const payload  = documentIngested ? { query: text } : { messages: prodHistory };
    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    hideProdTyping();
    if (data.reply) {
      addProdMessage(data.reply, false);
      if (!documentIngested) prodHistory.push({ role: 'assistant', content: data.reply });
    } else {
      addProdMessage('Error: No response.', false);
    }
  } catch (err) {
    hideProdTyping();
    addProdMessage('⚠️ Prod API connection failed.', false);
  }
}

prodInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});
prodInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendProdMessage(); }
});

// ════════════════════════════════════
//  FAVORITES & HISTORY LOGIC
// ════════════════════════════════════

function toggleFavorite() {
  const name = document.getElementById('nowName').textContent;
  const index = favorites.indexOf(name);
  if (index === -1) {
    favorites.push(name);
    showToast('❤️ Added to favorites!');
  } else {
    favorites.splice(index, 1);
    showToast('💔 Removed from favorites');
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  updateFavUI();
}

function updateFavUI() {
  // Update heart buttons if they exist
  const favBtn = document.getElementById('saveToolBtn');
  const name = document.getElementById('nowName').textContent;
  if (favBtn) {
    favBtn.innerHTML = favorites.includes(name) ? 'Saved <span style="color:#ec4899">❤️</span>' : 'Save ♡';
  }
}

function addToHistory(type, snippet) {
  const item = { type, snippet, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  recentHistory = recentHistory.filter(h => h.snippet !== snippet); // Avoid duplicates
  recentHistory.unshift(item);
  recentHistory = recentHistory.slice(0, 8); // Keep last 8 interactions
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentHistory));
  renderRecentUI();
}

function renderRecentUI() {
  const container = document.getElementById('recentHistoryContainer');
  if (!container) return;
  // Remove existing recent items
  document.querySelectorAll('.recent-item').forEach(el => el.remove());

  recentHistory.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.onclick = () => {
      routeToModal(item.type);
    };
    const dotColor = ['#7c5cfc', '#22c55e', '#3b82f6', '#ec4899', '#f59e0b'][i % 5];
    div.innerHTML = `
      <div class="recent-dot" style="background:${dotColor};"></div> 
      <div style="display:flex; flex-direction:column; gap:2px; overflow:hidden;">
        <span style="font-weight:600; font-size:11px; opacity:0.8;">${item.type}</span>
        <span style="font-size:10px; opacity:0.5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.snippet}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// Initial render
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initVoices();
  renderRecentUI();
  updateFavUI();
});

// Update openTool tracking
const _origRouteToModal = routeToModal;
routeToModal = function(name) {
  _origRouteToModal(name);
  // Initial history item when opening a tool if not already tracked
  updateFavUI();
};

// ════════════════════════════════════
//  RESEARCH & FILE UPLOAD
// ════════════════════════════════════
async function handleResearchFileUpload(input) {
  const file = input.files[0];
  if (!file) return;
  researchFileName.textContent = `Selected: ${file.name}`;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    currentResearchFileText = text;
    
    const statusBubble = addFeedMessage(researchFeed, `📄 File uploaded: **${file.name}** (${file.size} bytes). Extracting details and building index...`, false);
    statusBubble.classList.add('extracting');
    
    try {
      showToast('📄 Processing document for RAG...');
      const truncatedText = text.substring(0, 50000); // Increased limit for better RAG
      const res = await fetch('/api/research/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: truncatedText })
      });
      
      statusBubble.classList.remove('extracting');
      
      if (res.ok) {
        statusBubble.innerHTML = formatAIReply(`✅ Successfully ingested **${file.name}**. You can now ask complex questions about the content.`);
        documentIngested = true;
        addToHistory('Research AI', `Analyzed: ${file.name}`);
      } else {
        statusBubble.innerHTML = formatAIReply(`❌ Ingestion failed. The server returned an error.`);
      }
    } catch (err) {
      statusBubble.classList.remove('extracting');
      statusBubble.innerHTML = formatAIReply(`❌ Connection failed. Ensure the server is running.`);
      showToast('❌ Ingestion failed');
    }
  };
  reader.readAsText(file);
}

async function sendResearchMessage() {
  const text = researchInput.value.trim();
  if (!text) return;
  researchInput.value = '';
  researchInput.style.height = 'auto';
  addFeedMessage(researchFeed, text, true);
  const typingId = addTypingIndicator(researchFeed, '#3b82f6');

  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, history: researchHistory, useIngested: documentIngested })
    });
    removeTyping(researchFeed, typingId);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    addFeedMessage(researchFeed, data.reply, false);
    researchHistory.push({ role: 'user', content: text });
    researchHistory.push({ role: 'assistant', content: data.reply });
    addToHistory('Research AI', text.substring(0, 30) + '...');
  } catch (err) {
    removeTyping(researchFeed, typingId);
    showToast('❌ Failed to get response');
  }
}

// ════════════════════════════════════
//  IMAGE GENERATION
// ════════════════════════════════════
async function sendImagePrompt() {
  const text = imageInput.value.trim();
  if (!text) return;
  imageInput.value = '';
  imageEmptyDiv.style.display = 'none';
  generatedImage.classList.remove('loaded');
  imageLoader.style.display = 'flex';

  try {
    const res = await fetch('/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text })
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    if (data.base64) {
      generatedImage.src = `data:image/png;base64,${data.base64}`;
      generatedImage.onload = () => {
        imageLoader.style.display = 'none';
        generatedImage.classList.add('loaded');
      };
    } else {
      throw new Error('No image returned');
    }
  } catch (err) {
    imageLoader.style.display = 'none';
    imageEmptyDiv.style.display = 'flex';
    imageEmptyDiv.innerHTML = '<div class="empty-icon">⚠️</div><div>Failed to generate image. Try again.</div>';
    showToast('Image generation failed');
  }
}

if (imageInput) {
  imageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendImagePrompt(); }
  });
}
// ════════════════════════════════════
//  ONBOARDING logic
// ════════════════════════════════════
function initOnboarding() {
  if (!localStorage.getItem('aihub_onboarded')) {
    const tip = document.createElement('div');
    tip.className = 'onboard-tip';
    tip.innerHTML = `
      <div style="font-weight:700; margin-bottom:5px;">Welcome to AIHUB! 🚀</div>
      <div style="font-size:12px; opacity:0.8;">Click any card to start generating. Use Ctrl+K to search anytime!</div>
      <button onclick="this.parentElement.remove(); localStorage.setItem('aihub_onboarded','true');" style="margin-top:10px; background:#7c5cfc; border:none; color:white; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer;">Got it!</button>
    `;
    document.body.appendChild(tip);
    setTimeout(() => tip.classList.add('show'), 1000);
  }
}
window.addEventListener('load', initOnboarding);

// ════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ════════════════════════════════════
document.addEventListener('keydown', (e) => {
  // Ctrl+K or Cmd+K → focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.focus();
    showToast('🔍 Search activated');
  }
  // Escape → close any open modal
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// ════════════════════════════════════
//  MUSIC PLAYER & SEARCH
// ════════════════════════════════════
const musicResultsGrid = document.getElementById('musicResultsGrid');
const musicSearchInput = document.getElementById('musicSearchInput');
const audioPlayerContainer = document.getElementById('audioPlayerContainer');
const mainAudio = document.getElementById('mainAudio');
const playBtn = document.getElementById('playBtn');
const playerSongTitle = document.getElementById('playerSongTitle');
const audioProgress = document.getElementById('audioProgress');
const audioTime = document.getElementById('audioTime');

async function searchMusic() {
  const query = musicSearchInput.value.trim();
  if (!query) return;
  
  musicResultsGrid.innerHTML = '<div class="spinner" style="grid-column:1/-1; margin: 40px auto;"></div>';
  
  try {
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const songs = await res.json();
    
    if (songs.length === 0) {
      musicResultsGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No results found for "${query}"</div>`;
      return;
    }
    
    musicResultsGrid.innerHTML = '';
    songs.forEach(song => {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.style.padding = '10px';
      card.innerHTML = `
        <div style="position:relative; width:100%; aspect-ratio:1; border-radius:10px; overflow:hidden; margin-bottom:8px;">
          <img src="${song.thumbnail}" style="width:100%; height:100%; object-fit:cover;">
          <button onclick="playSong('${song.audio_url}', '${song.title.replace(/'/g, "\\'")}')" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); border:none; color:#fff; font-size:24px; cursor:pointer; opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center;">▶</button>
        </div>
        <div style="font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.title}</div>
        <div style="font-size:10px; color:var(--text3);">${song.artist}</div>
        <div style="display:flex; gap:5px; margin-top:8px;">
           <button class="pill" style="padding:4px 8px; font-size:9px;" onclick="window.open('${song.youtube_url}', '_blank')">YouTube</button>
           <button class="pill" style="padding:4px 8px; font-size:9px;" onclick="window.open('${song.audio_url}', '_blank')">Save</button>
        </div>
      `;
      card.querySelector('button').addEventListener('mouseover', function() { this.style.opacity = '1'; });
      card.querySelector('button').addEventListener('mouseout', function() { this.style.opacity = '0'; });
      musicResultsGrid.appendChild(card);
    });
  } catch (err) {
    musicResultsGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">⚠️ API Error. Try another search.</div>`;
  }
}

function playSong(url, title) {
  audioPlayerContainer.style.display = 'flex';
  playerSongTitle.textContent = title;
  mainAudio.src = url;
  mainAudio.play();
  playBtn.textContent = '⏸';
  showToast('🎵 Playing: ' + title);
}

function toggleAudio() {
  if (mainAudio.paused) {
    mainAudio.play();
    playBtn.textContent = '⏸';
  } else {
    mainAudio.pause();
    playBtn.textContent = '▶';
  }
}

function updateProgress() {
  if (mainAudio.duration) {
    const val = (mainAudio.currentTime / mainAudio.duration) * 100;
    audioProgress.value = val;
    const mins = Math.floor(mainAudio.currentTime / 60);
    const secs = Math.floor(mainAudio.currentTime % 60);
    audioTime.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

function onAudioEnded() {
  playBtn.textContent = '▶';
  audioProgress.value = 0;
}

audioProgress.addEventListener('input', () => {
  const time = (audioProgress.value / 100) * mainAudio.duration;
  mainAudio.currentTime = time;
});

// ════════════════════════════════════
//  VIDEO TOOLKIT LOGIC
// ════════════════════════════════════
function setVideoToolTab(el, id) {
  document.querySelectorAll('.vtool-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.vtab').forEach(t => t.classList.remove('active'));
  document.getElementById('vTool-' + id).style.display = (id === 'creative') ? 'flex' : 'block';
  el.classList.add('active');
}

async function analyzeVideoTranscript() {
  const url = document.getElementById('ytUrlInput').value.trim();
  const resDiv = document.getElementById('videoAnalysisResult');
  if (!url) return;
  
  resDiv.style.display = 'block';
  resDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div> Analyzing video...';
  
  try {
    const res = await fetch('/api/video/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!res.ok) throw new Error('Could not get transcript');
    const data = await res.json();
    
    // Send transcript to summarizer
    resDiv.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div> Writing AI Summary...';
    const chatRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [
          { role: 'system', content: 'You are a Video Analyst. Summarize the following transcript deeply. Format with: 💡 MAIN THEME, 🔑 KEY TAKEAWAYS, and 📝 CONCLUSION.' },
          { role: 'user', content: `Summarize this video transcript: ${data.transcript.substring(0, 15000)}` }
        ]
      })
    });
    
    const summaryData = await chatRes.json();
    resDiv.innerHTML = formatAIReply(summaryData.reply);
  } catch (err) {
    resDiv.innerHTML = `<div style="color:#ef4444;">⚠️ Error: ${err.message}. Make sure the video is public and has captions.</div>`;
  }
}

// routeToModal fallback (primary router is defined above at line ~176)
// This overrides the inline script version cleanly
window.routeToModal = routeToModal;
