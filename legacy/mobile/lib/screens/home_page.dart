import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/app_mode.dart';
import '../state/app_controller.dart';
import '../theme/palette.dart';
import '../widgets/mode_card.dart';

/// Home: two reorderable mode cards. Tap opens a mode, press-and-hold drags
/// to swap their order (persisted across launches).
class HomePage extends StatelessWidget {
  const HomePage({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final constraintsRaw = MediaQuery.sizeOf(context);
    final cardWidth =
        math.min(constraintsRaw.width * 0.40, 300.0).toDouble();
    const cardHeight = 210.0;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.touch_app_rounded,
                      color: Palette.mouseAccent, size: 22),
                  const SizedBox(width: 10),
                  const Text('DTCON',
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 4)),
                  const Spacer(),
                  ListenableBuilder(
                    listenable: controller,
                    builder: (context, _) => Text(
                      'MODE ORDER SAVED',
                      style: TextStyle(
                          fontSize: 10,
                          letterSpacing: 2,
                          color: Palette.textFaint),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Center(
                child: SizedBox(
                  height: cardHeight,
                  width: constraintsRaw.width,
                  child: ListenableBuilder(
                    listenable: controller,
                    builder: (context, _) => ReorderableListView(
                      scrollDirection: Axis.horizontal,
                      physics: const NeverScrollableScrollPhysics(),
                      buildDefaultDragHandles: false,
                      onReorder: (oldIndex, newIndex) {
                        final order = List.of(controller.modeOrder);
                        if (newIndex > oldIndex) newIndex -= 1;
                        final moved = order.removeAt(oldIndex);
                        order.insert(newIndex, moved);
                        controller.setModeOrder(order);
                      },
                      children: [
                        for (var i = 0; i < controller.modeOrder.length; i++)
                          Padding(
                            key: ValueKey(controller.modeOrder[i]),
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            child: SizedBox(
                              width: cardWidth,
                              height: cardHeight,
                              child: ReorderableDelayedDragStartListener(
                                index: i,
                                child: ModeCard(
                                  mode: controller.modeOrder[i],
                                  controller: controller,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              const Spacer(),
              Center(
                child: Text('Tap to open  ·  press & hold a card to rearrange',
                    style:
                        TextStyle(fontSize: 11.5, color: Palette.textDim)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}