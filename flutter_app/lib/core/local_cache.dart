import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// On-device cache so the app opens instantly with last synced data.
class LocalCache {
  static const _prefix = 'velora_cache_';

  static Future<void> set(String key, dynamic value) async {
    final p = await SharedPreferences.getInstance();
    await p.setString('$_prefix$key', jsonEncode(value));
  }

  static Future<dynamic> get(String key) async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString('$_prefix$key');
    if (raw == null) return null;
    return jsonDecode(raw);
  }

  static Future<void> clearAll() async {
    final p = await SharedPreferences.getInstance();
    for (final k in p.getKeys()) {
      if (k.startsWith(_prefix)) await p.remove(k);
    }
  }
}
