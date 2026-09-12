import 'package:flutter/material.dart';

import '../theme/palette.dart';

/// Controller modes. Order in the list is the persisted home arrangement.
enum AppMode {
  mouse('mouse', 'Touchpad', 'Precision cursor control', Palette.mouseAccent,
      Palette.mouseAccentSoft, Icons.touch_app),
  joystick('joystick', 'Joystick', 'Game controls · soon', Palette.joystickAccent,
      Palette.joystickAccentSoft, Icons.sports_esports);

  const AppMode(this.storageKey, this.title, this.subtitle, this.color,
      this.colorSoft, this.icon);

  final String storageKey;
  final String title;
  final String subtitle;
  final Color color;
  final Color colorSoft;
  final IconData icon;

  static final List<AppMode> defaultOrder = AppMode.values.toList();

  static AppMode fromStorageKey(String key) =>
      AppMode.values.firstWhere((m) => m.storageKey == key,
          orElse: () => AppMode.mouse);
}