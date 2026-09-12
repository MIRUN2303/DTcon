import 'package:flutter/material.dart';

import 'palette.dart';

abstract final class AppTheme {
  static ThemeData get dark {
    final base = ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Palette.background,
      colorScheme: const ColorScheme.dark(
        surface: Palette.surface,
        primary: Palette.mouseAccent,
        secondary: Palette.joystickAccent,
        onSurface: Palette.text,
      ),
      useMaterial3: true,
      fontFamily: 'Roboto',
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: Palette.text,
        displayColor: Palette.text,
      ),
      dividerColor: Palette.border,
      splashFactory: InkRipple.splashFactory,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
    );
  }
}