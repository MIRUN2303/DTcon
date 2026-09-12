import 'package:flutter/material.dart';

import '../bluetooth/bluetooth_service.dart';
import '../state/app_controller.dart';
import '../theme/palette.dart';

/// Minimal status chip for the mouse page. Tap to reconnect when not linked.
class ConnectionPill extends StatelessWidget {
  const ConnectionPill({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final status = controller.connection;
    final (color, label) = switch (status) {
      ConnectionStatus.connected => (Palette.ok, 'Connected'),
      ConnectionStatus.searching => (Palette.warn, 'Searching…'),
      ConnectionStatus.connecting => (Palette.warn, 'Connecting…'),
      ConnectionStatus.lost => (Palette.danger, 'Lost — tap to retry'),
      ConnectionStatus.disconnected => (Palette.textFaint, 'Offline'),
    };

    return GestureDetector(
      onTap: status == ConnectionStatus.connected
          ? null
          : controller.reconnect,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 12, letterSpacing: 0.2)),
          ],
        ),
      ),
    );
  }
}