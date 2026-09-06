import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  static const _fontFamily = 'Segoe UI';

  static ThemeData get light {
    const textTheme = TextTheme(
      displayLarge: TextStyle(fontFamily: _fontFamily, fontWeight: FontWeight.w800),
      titleLarge: TextStyle(fontFamily: _fontFamily, fontWeight: FontWeight.w800),
      titleMedium: TextStyle(fontFamily: _fontFamily, fontWeight: FontWeight.w700),
      bodyLarge: TextStyle(fontFamily: _fontFamily),
      bodyMedium: TextStyle(fontFamily: _fontFamily),
      labelLarge: TextStyle(fontFamily: _fontFamily, fontWeight: FontWeight.w600),
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: _fontFamily,
      fontFamilyFallback: const ['Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.indigo,
        primary: AppColors.indigo,
        secondary: AppColors.violet,
        surface: Colors.white,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: AppColors.slate50,
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.slate900,
        titleTextStyle: TextStyle(fontFamily: _fontFamily, fontWeight: FontWeight.w800, fontSize: 20),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: AppColors.indigo.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontFamily: _fontFamily, fontWeight: FontWeight.w600, fontSize: 12),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade200)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.indigo, width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.indigo,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 50),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontFamily: _fontFamily, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
