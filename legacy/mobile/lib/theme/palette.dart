import 'package:flutter/material.dart';

/// Paid-membership restraint: a calm dark base with two accents.
abstract final class Palette {
  static const Color background = Color(0xFF0E1116);
  static const Color surface = Color(0xFF151A21);
  static const Color surfaceHi = Color(0xFF1C232D);
  static const Color border = Color(0xFF232B36);
  static const Color lineStrong = Color(0xFF2E3A48);

  static const Color text = Color(0xFFE8EAED);
  static const Color textDim = Color(0xFF8B96A3);
  static const Color textFaint = Color(0xFF5B6674);

  static const Color mouseAccent = Color(0xFF2DD4BF); // teal-400
  static const Color mouseAccentSoft = Color(0x2E2DD4BF);
  static const Color joystickAccent = Color(0xFFA78BFA); // violet-400
  static const Color joystickAccentSoft = Color(0x2EA78BFA);

  static const Color ok = Color(0xFF34D399);
  static const Color warn = Color(0xFFFBBF24);
  static const Color danger = Color(0xFFF87171);
}