import 'package:flutter/material.dart';

import 'screens/home_page.dart';
import 'screens/intro_page.dart';
import 'screens/joystick_page.dart';
import 'screens/mouse_page.dart';
import 'state/app_controller.dart';
import 'theme/app_theme.dart';

class DtconApp extends StatelessWidget {
  const DtconApp({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DTCON',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: _Root(controller: controller),
    );
  }
}

/// Swaps between pages with a gentle cross-fade.
class _Root extends StatelessWidget {
  const _Root({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final page = switch (controller.page) {
          AppPage.intro => IntroPage(controller: controller),
          AppPage.home => HomePage(controller: controller),
          AppPage.mouse => MousePage(controller: controller),
          AppPage.joystick => JoystickPage(controller: controller),
        };
        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          child: KeyedSubtree(key: ValueKey(controller.page), child: page),
        );
      },
    );
  }
}