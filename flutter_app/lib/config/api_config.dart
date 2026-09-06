import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';

/// API base URL — compile-time override, then saved preference, then platform default.
class ApiConfig {
  static const String _envUrl = String.fromEnvironment('API_URL');

  /// Mobile/release → Render. Flutter **web** dev → local API (avoids CORS).
  static String get platformDefault {
    if (_envUrl.isNotEmpty) return _normalize(_envUrl);
    if (kIsWeb) return 'http://localhost:5000';
    return 'https://velora-fintech.onrender.com';
  }

  static String _baseUrl = platformDefault;
  static String get baseUrl => _baseUrl;
  static String get apiBase => '${_baseUrl.replaceAll(RegExp(r'/+$'), '')}/api';

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('velora_api_base_url')?.trim();

    // Always force production API on real devices unless dart-define overrides it.
    if (!kIsWeb && _envUrl.isEmpty) {
      // Clear bad saved URLs (localhost) that break phone installs.
      if (saved != null && (saved.contains('localhost') || saved.contains('127.0.0.1'))) {
        await prefs.remove('velora_api_base_url');
        _baseUrl = platformDefault;
        return;
      }
    }

    if (saved != null && saved.isNotEmpty) {
      // Chrome cannot call Render until backend CORS is redeployed — use local API for web dev.
      if (kIsWeb && _envUrl.isEmpty && saved.contains('onrender.com')) {
        _baseUrl = 'http://localhost:5000';
        await prefs.setString('velora_api_base_url', _baseUrl);
        return;
      }
      _baseUrl = _normalize(saved);
      return;
    }

    _baseUrl = platformDefault;
  }

  static Future<void> setBaseUrl(String url) async {
    _baseUrl = _normalize(url);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('velora_api_base_url', _baseUrl);
  }

  static Future<void> resetToDefault() async {
    _baseUrl = platformDefault;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('velora_api_base_url');
  }

  static String _normalize(String url) {
    var u = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://$u';
    }
    return u;
  }
}
