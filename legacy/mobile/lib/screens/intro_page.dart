import 'package:flutter/material.dart';

import '../core/app_const.dart';
import '../state/app_controller.dart';
import '../theme/palette.dart';

/// 1.2s branded splash with a staggered logo/build animation.
class IntroPage extends StatefulWidget {
  const IntroPage({super.key, required this.controller});

  final AppController controller;

  @override
  State<IntroPage> createState() => _IntroPageState();
}

class _IntroPageState extends State<IntroPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim = AnimationController(
      vsync: this, duration: AppConst.introDuration)..addStatusListener((s) {
    if (s == AnimationStatus.completed && mounted) {
      widget.controller.finishIntro();
    }
  });

  @override
  void initState() {
    super.initState();
    _anim.forward();
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scale = CurvedAnimation(parent: _anim, curve: Curves.easeOutBack);
    final fade = CurvedAnimation(parent: _anim, curve: Curves.easeIn);

    return Scaffold(
      backgroundColor: Palette.background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ScaleTransition(
              scale: scale,
              child: FadeTransition(
                opacity: fade,
                child: Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Palette.mouseAccent,
                        Palette.joystickAccent,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Palette.mouseAccent.withValues(alpha: 0.25),
                        blurRadius: 40,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.touch_app_rounded,
                      color: Palette.background, size: 40),
                ),
              ),
            ),
            const SizedBox(height: 20),
            FadeTransition(
              opacity: fade,
              child: const Column(
                children: [
                  Text('DTCON',
                      style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 6)),
                  SizedBox(height: 6),
                  Text('WIRELESS TOUCHPAD',
                      style: TextStyle(
                          fontSize: 11,
                          letterSpacing: 3,
                          color: Palette.textDim)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}