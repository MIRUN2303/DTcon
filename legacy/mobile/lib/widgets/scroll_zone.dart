import 'package:flutter/material.dart';

import '../state/app_controller.dart';
import '../theme/palette.dart';

/// Right-edge vertical wheel area. Swiping scrolls; the strip subtly widens
/// and brightens while active, then collapses back (AnimatedContainer).
class ScrollZone extends StatefulWidget {
  const ScrollZone({super.key, required this.controller});

  final AppController controller;

  @override
  State<ScrollZone> createState() => _ScrollZoneState();
}

class _ScrollZoneState extends State<ScrollZone> {
  bool _active = false;
  double _localY = 0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onVerticalDragStart: (_) => setState(() {
        _active = true;
        _localY = 0;
      }),
      onVerticalDragUpdate: (d) {
        // Scroll zone dy: dragging up should scroll content up (positive).
        final dy = -d.delta.dy;
        _localY += dy;
        setState(() {});
        widget.controller.scrollDelta(dy);
      },
      onVerticalDragEnd: (_) => WidgetsBinding.instance.addPostFrameCallback(
          (_) => setState(() => _active = false)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        width: _active ? 26 : 16,
        decoration: BoxDecoration(
          color: _active
              ? Palette.surfaceHi
              : Palette.surface.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _active ? Palette.lineStrong : Palette.border,
          ),
        ),
        alignment: Alignment.center,
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 180),
          opacity: _active ? 1 : 0.35,
          child: Icon(
            Icons.scroll_rounded,
            size: _active ? 16 : 12,
            color: _active ? Palette.mouseAccent : Palette.textFaint,
          ),
        ),
      ),
    );
  }
}