import 'package:flutter/material.dart';

import '../core/app_const.dart';
import '../state/app_controller.dart';
import '../theme/palette.dart';

/// Compact vertical DPI control for the left rail.
class DpiControl extends StatelessWidget {
  const DpiControl({super.key, required this.dpi, this.onChange});

  final int dpi;
  final ValueChanged<int>? onChange;

  @override
  Widget build(BuildContext context) {
    void bump(int delta) => onChange?.call(dpi + delta * AppConst.dpiStep);

    Widget step(IconData icon, int delta) => _StepButton(
          icon: icon,
          onTap: () => bump(delta),
        );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('DPI', style: TextStyle(color: Palette.textDim, fontSize: 11)),
        const SizedBox(height: 8),
        step(Icons.remove_rounded, -1),
        const SizedBox(height: 6),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 120),
          child: Text(
            '$dpi',
            key: ValueKey(dpi),
            style: const TextStyle(
                fontSize: 14, fontWeight: FontWeight.w600, color: Palette.text),
          ),
        ),
        const SizedBox(height: 6),
        step(Icons.add_rounded, 1),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: () => onChange?.call(AppConst.defaultDpi),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            child: Icon(Icons.restart_alt_rounded,
                size: 16, color: Palette.textFaint),
          ),
        ),
      ],
    );
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: Palette.surfaceHi,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Palette.border),
        ),
        child: Icon(icon, size: 16, color: Palette.textDim),
      ),
    );
  }
}