import 'package:flutter/material.dart';

import '../core/protocol_constants.dart';
import '../state/app_controller.dart';
import '../theme/palette.dart';
import '../widgets/connection_pill.dart';
import '../widgets/dpi_control.dart';
import '../widgets/scroll_zone.dart';

/// The wireless touchpad. Full landscape layout:
///   left rail:  home · DPI
///   center:     connection pill + pad (taps, move, hold-drag) + click strip
///   right:      vertical scroll zone, then Back/Forward/Prev/Next rail
class MousePage extends StatelessWidget {
  MousePage({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _LeftRail(controller: controller),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  children: [
                    const SizedBox(height: 4),
                    Center(child: ConnectionPill(controller: controller)),
                    const SizedBox(height: 10),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: _Trackpad(controller: controller),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Center(child: ScrollZone(controller: controller)),
              const SizedBox(width: 12),
              _RightRail(controller: controller),
            ],
          ),
        ),
      ),
    );
  }
}

class _LeftRail extends StatelessWidget {
  const _LeftRail({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _RailIcon(onTap: controller.goHome, icon: Icons.home_rounded),
        const Spacer(),
        ListenableBuilder(
          listenable: controller,
          builder: (context, _) =>
              DpiControl(dpi: controller.dpi, onChange: controller.setDpi),
        ),
      ],
    );
  }
}

class _RightRail extends StatelessWidget {
  const _RightRail({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final active = controller.connected;
        final dim = active ? 1.0 : 0.35;
        void nav(NavAction a) => controller.nav(a);
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _RailIcon(
                onTap: () => nav(NavAction.back),
                icon: Icons.arrow_back_ios_new_rounded,
                opacity: dim),
            _RailIcon(
                onTap: () => nav(NavAction.forward),
                icon: Icons.arrow_forward_ios_rounded,
                opacity: dim),
            const SizedBox(height: 10),
            _RailIcon(
                onTap: () => nav(NavAction.prevTrack),
                icon: Icons.skip_previous_rounded,
                opacity: dim),
            _RailIcon(
                onTap: () => nav(NavAction.nextTrack),
                icon: Icons.skip_next_rounded,
                opacity: dim),
          ],
        );
      },
    );
  }
}

class _RailIcon extends StatelessWidget {
  const _RailIcon({
    required this.onTap,
    required this.icon,
    this.opacity = 1.0,
  });

  final VoidCallback onTap;
  final IconData icon;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: opacity,
        child: Container(
          width: 46,
          height: 46,
          margin: const EdgeInsets.symmetric(vertical: 5),
          decoration: BoxDecoration(
            color: Palette.surfaceHi,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Palette.border),
          ),
          child: Icon(icon, size: 18, color: Palette.textDim),
        ),
      ),
    );
  }
}

class _Trackpad extends StatelessWidget {
  const _Trackpad({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      return Container(
        decoration: BoxDecoration(
          color: Palette.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Palette.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Cursor surface: move, tap-to-click, hold-to-drag.
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapDown: (d) =>
                    controller.panContact(d.localPosition.dx, d.localPosition.dy),
                onPanStart: (_) {},
                onPanUpdate: (d) =>
                    controller.panMove(d.delta.dx, d.delta.dy),
                onPanEnd: (_) => controller.panLift(),
                onPanCancel: controller.panLift,
                onTap: controller.tapClick,
              ),
            ),
            // Click strip: left/right halves, hairlines only.
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 64,
              child: Row(
                children: [
                  Expanded(
                    child: _ClickZone(
                      alignment: Alignment.centerLeft,
                      icon: Icons.chevron_left_rounded,
                      onTapUp: controller.tapClick,
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 40,
                    color: Palette.lineStrong,
                  ),
                  Expanded(
                    child: _ClickZone(
                      alignment: Alignment.centerRight,
                      icon: Icons.chevron_right_rounded,
                      onTapUp: controller.secondaryClick,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    });
  }
}

class _ClickZone extends StatelessWidget {
  const _ClickZone({
    required this.alignment,
    required this.icon,
    required this.onTapUp,
  });

  final Alignment alignment;
  final IconData icon;
  final VoidCallback onTapUp;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapUp: (_) => onTapUp(),
      child: Align(
        alignment: alignment,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Opacity(
            opacity: 0.4,
            child: Icon(icon, size: 18, color: Palette.textFaint),
          ),
        ),
      ),
    );
  }
}