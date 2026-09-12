import 'package:flutter/material.dart';

import '../services/app_mode.dart';
import '../state/app_controller.dart';
import '../theme/palette.dart';

/// Joystick — wired up for the second milestone; here it's a premium
/// placeholder that confirms the mode exists and communicates where it goes.
class JoystickPage extends StatelessWidget {
  const JoystickPage({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    const accent = AppMode.joystick.color;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
          child: Column(
            children: [
              Row(
                children: [
                  _BackButton(onTap: controller.goHome),
                  const Spacer(),
                  const Icon(Icons.sports_esports_rounded,
                      color: accent, size: 22),
                  const SizedBox(width: 10),
                  const Text('JOYSTICK',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 4)),
                  const Spacer(),
                  const SizedBox(width: 46),
                ],
              ),
              const Spacer(),
              Column(
                children: [
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: accent.withValues(alpha: 0.5)),
                      gradient: RadialGradient(
                        colors: [
                          accent.withValues(alpha: 0.35),
                          accent.withValues(alpha: 0.02),
                        ],
                      ),
                    ),
                    child: Center(
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: accent,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text('COMING SOON',
                      style: TextStyle(
                          fontSize: 13,
                          letterSpacing: 5,
                          color: Palette.textFaint)),
                  const SizedBox(height: 12),
                  const Text('Your phone becomes a wireless game controller.',
                      style: TextStyle(
                          fontSize: 14, color: Palette.textDim)),
                  const SizedBox(height: 6),
                  const Text('Currently shipped with touchpad only.',
                      style: TextStyle(
                          fontSize: 12.5, color: Palette.textFaint)),
                ],
              ),
              const Spacer(),
              Center(
                child: Text('DTCON  ·  Joystick milestone planned',
                    style:
                        TextStyle(fontSize: 11, color: Palette.textFaint)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: Palette.surfaceHi,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Palette.border),
        ),
        child: const Icon(Icons.home_rounded, size: 18, color: Palette.textDim),
      ),
    );
  }
}