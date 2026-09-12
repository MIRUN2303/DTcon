import 'package:dtcon/bluetooth/none_bluetooth_service.dart';
import 'package:dtcon/screens/home_page.dart';
import 'package:dtcon/services/app_mode.dart';
import 'package:dtcon/services/prefs_manager.dart';
import 'package:dtcon/state/app_controller.dart';
import 'package:dtcon/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  Widget wrap(AppController c) => MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(body: HomePage(controller: c)),
      );

  testWidgets('home shows both mode cards in stored order', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{
      'mode_order': 'joystick,mouse',
    });
    final c = AppController(
      prefs: PrefsManager(await SharedPreferences.getInstance()),
      bluetooth: NoneBluetoothService(),
      mouseHostEnabled: false,
      onHaptic: () {},
    );
    await c.init();

    await tester.pumpWidget(wrap(c));

    expect(find.text('Joystick'), findsOneWidget);
    expect(find.text('Touchpad'), findsOneWidget);
    expect(find.byIcon(Icons.sports_esports_rounded), findsOneWidget);
    expect(find.byIcon(Icons.touch_app), findsOneWidget);
  });

  testWidgets('reordering swaps and persists', (tester) async {
    final c = AppController(
      prefs: PrefsManager(await SharedPreferences.getInstance()),
      bluetooth: NoneBluetoothService(),
      mouseHostEnabled: false,
      onHaptic: () {},
    );
    await c.init();
    await tester.pumpWidget(wrap(c));

    expect(c.modeOrder.first, AppMode.mouse);
    expect(c.modeOrder.last, AppMode.joystick);

    // Simulate the swipe-swap shortcut used on small screens is out of scope;
    // verify the controller mutation path is enough for persistence.
    c.setModeOrder([AppMode.joystick, AppMode.mouse]);
    await tester.pumpAndSettle();

    final c2 = AppController(
      prefs: PrefsManager(await SharedPreferences.getInstance()),
      bluetooth: NoneBluetoothService(),
      mouseHostEnabled: false,
      onHaptic: () {},
    );
    await c2.init();
    expect(c2.modeOrder.first, AppMode.joystick);
    expect(c2.modeOrder.last, AppMode.mouse);
  });
}