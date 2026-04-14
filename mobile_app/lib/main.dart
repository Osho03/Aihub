import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:permission_handler/permission_handler.dart';

void main() {
  runApp(const MaterialApp(home: AiHubApp()));
}

class AiHubApp extends StatefulWidget {
  const AiHubApp({super.key});

  @override
  State<AiHubApp> createState() => _AiHubAppState();
}

class _AiHubAppState extends State<AiHubApp> {
  late final WebViewController controller;
  bool isLoading = true;
  bool _isLoaded = false;

  // IMPORTANT: YOUR PERMANENT RENDER URL
  final String appUrl = "https://aihub-9dbr.onrender.com";

  @override
  void initState() {
    super.initState();
    
    // 3. Wrap async calls inside post-frame callback
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await requestPermissions();
    });
    
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) {
              setState(() => isLoading = true);
            }
          },
          onPageFinished: (String url) {
            // 2 & 3. Add mounted check and set _isLoaded on finish
            if (mounted) {
              setState(() {
                isLoading = false;
                _isLoaded = true;
              });
            }
          },
        ),
      )
      ..clearCache() // Small helpful addition for cold launches
      ..loadRequest(Uri.parse(appUrl));
  }

  Future<void> requestPermissions() async {
    await [
      Permission.microphone,
      Permission.audio,
    ].request();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // 1. Fix opaque generic colors to match specific app theme layout bounds
      backgroundColor: const Color(0xFF0E0E0E),
      body: SafeArea(
        child: Stack(
          children: [
            // 2. Hide WebView visually until the page finishes loading
            Opacity(
              opacity: _isLoaded ? 1.0 : 0.0,
              child: WebViewWidget(controller: controller),
            ),
            if (!_isLoaded || isLoading)
              const Center(
                child: CircularProgressIndicator(color: Color(0xFF7C5CFC)),
              ),
          ],
        ),
      ),
    );
  }
}
