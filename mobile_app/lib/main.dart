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

  // IMPORTANT: YOUR PERMANENT RENDER URL
  final String appUrl = "https://aihub-9dbr.onrender.com";

  @override
  void initState() {
    super.initState();
    requestPermissions();
    
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() => isLoading = true);
          },
          onPageFinished: (String url) {
            setState(() => isLoading = false);
          },
        ),
      )
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
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: controller),
            if (isLoading)
              const Center(
                child: CircularProgressIndicator(color: Color(0xFF7C5CFC)),
              ),
          ],
        ),
      ),
    );
  }
}
