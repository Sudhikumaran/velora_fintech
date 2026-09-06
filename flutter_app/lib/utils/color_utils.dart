import 'package:flutter/material.dart';

Color parseHexColor(String hex, [Color fallback = const Color(0xFF6366F1)]) {
  try {
    final h = hex.replaceFirst('#', '');
    return Color(int.parse('FF$h', radix: 16));
  } catch (_) {
    return fallback;
  }
}

List<Color> gradientFromHex(String hex) {
  final c = parseHexColor(hex);
  return [c, Color.lerp(c, Colors.white, 0.25)!];
}
