import 'package:flutter/material.dart';

import '../services/app_mode.dart';
import '../state/app_controller.dart';
import '../theme/palette.dart';

/// One home-screen tile. Tap opens the mode; a long press is hijacked by the
/// enclosing [ReorderableDelayedDragStartListener] to rearrange the row.
class ModeCard extends StatelessWidget {
  const ModeCard({super.key, required this.mode, required this.controller});

  final AppMode mode;
  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Palette.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: Palette.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: GestureDetector(
        onTap: () {
          switch (mode) {
            case AppMode.mouse:
              controller.openMouse();
              break;
            case AppMode.joystick:
              controller.openJoystick();
              break;
          }
        },
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                mode.colorSoft.withValues(alpha: 0.55),
                Colors.transparent,
              ],
            ),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(mode.icon, size: 26, color: mode.color),
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: mode.color,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.reorder_rounded,
                        size: 14, color: Palette.background),
                  ),
                ],
              ),
              const Spacer(),
              Text(mode.title,
                  style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.2)),
              const SizedBox(height: 4),
              Text(mode.subtitle,
                  style: TextStyle(
                      fontSize: 12.5, color: Palette.textDim)),
            ],
          ),
        ),
      ),
    );
  }
}