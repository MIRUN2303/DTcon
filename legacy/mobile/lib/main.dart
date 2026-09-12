import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';
import 'bluetooth/ble_peripheral_service.dart';
import 'services/prefs_manager.dart';
import 'state/app_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  final prefs = PrefsManager(await SharedPreferences.getInstance());
  final controller = AppController(
    prefs: prefs,
    bluetooth: BlePeripheralService(),
    mouseHostEnabled: true,
  );
  await controller.init();

  runApp(DtconApp(controller: controller));
}