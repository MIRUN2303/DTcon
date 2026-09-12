import 'package:dtcon/bluetooth/bluetooth_service.dart';
import 'package:dtcon/bluetooth/none_bluetooth_service.dart';
import 'package:dtcon/core/protocol_constants.dart';
import 'package:dtcon/services/app_mode.dart';
import 'package:dtcon/services/prefs_manager.dart';
import 'package:dtcon/state/app_controller.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  Future<(AppController, NoneBluetoothService)> makeController() async {
    final bt = NoneBluetoothService();
    final c = AppController(
      prefs: PrefsManager(await SharedPreferences.getInstance()),
      bluetooth: bt,
      mouseHostEnabled: false,
      onHaptic: () {},
    );
    return (c, bt);
  }

  group('mode order', () {
    test('defaults to declaration order', () async {
      final (c, _) = await makeController();
      await c.init();
      expect(c.modeOrder, AppMode.defaultOrder);
    });

    test('swap persists across controller instances', () async {
      var (c, _) = await makeController();
      await c.init();
      expect(c.modeOrder, ['mouse', 'joystick']);

      c.swapModeCards();
      expect(c.modeOrder, ['joystick', 'mouse']);

      (c, _) = await makeController();
      await c.init();
      expect(c.modeOrder, ['joystick', 'mouse']);
    });

    test('stored order wins over default', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{
        'mode_order': 'joystick,mouse',
      });
      final (c, _) = await makeController();
      await c.init();
      expect(c.modeOrder, ['joystick', 'mouse']);
    });
  });

  group('settings', () {
    test('dpi clamps and persists', () async {
      final (c, _) = await makeController();
      await c.init();
      c.setDpi(4000);
      expect(c.dpi, 3200);

      final (c2, _) = await makeController();
      await c2.init();
      expect(c2.dpi, 3200);
    });

    test('scroll sensitivity persists', () async {
      final (c, _) = await makeController();
      await c.init();
      c.setScrollSensitivity(2.5);
      expect(c.scrollSensitivity, 2.5);

      final (c2, _) = await makeController();
      await c2.init();
      expect(c2.scrollSensitivity, 2.5);
    });
  });

  group('connection', () {
    test('tracks service status', () async {
      final (c, bt) = await makeController();
      await c.init();
      bt.setStatus(ConnectionStatus.searching);
      await Future<void>.delayed(Duration.zero);
      expect(c.connection, ConnectionStatus.searching);

      bt.setStatus(ConnectionStatus.connected);
      await Future<void>.delayed(Duration.zero);
      expect(c.connection, ConnectionStatus.connected);
      expect(c.connected, isTrue);
    });
  });

  group('input pipeline', () {
    test('tap sends left down+up when connected', () async {
      final (c, bt) = await makeController();
      await c.init();
      bt.setStatus(ConnectionStatus.connected);
      await Future<void>.delayed(Duration.zero);

      c.tapClick();
      final buttons =
          bt.sent.where((b) => b[1] == 0x11).map((b) => (b[6], b[7])).toList();
      expect(buttons, [(0x01, 1), (0x01, 0)]);
    });

    test('input is dropped when not connected', () async {
      final (c, bt) = await makeController();
      await c.init();
      c.tapClick();
      expect(bt.sent, isEmpty);
    });

    test('nav is dropped when not connected', () async {
      final (c, bt) = await makeController();
      await c.init();
      c.nav(NavAction.back);
      expect(bt.sent, isEmpty);
    });

    test('hold-and-drag presses left and carries it on moves', () async {
      final (c, bt) = await makeController();
      await c.init();
      c.openMouse();
      bt.setStatus(ConnectionStatus.connected);

      c.panContact(0, 0);
      await Future<void>.delayed(const Duration(milliseconds: 350));

      final down = bt.sent.where((b) => b[1] == 0x11 && b[7] == 1).toList();
      expect(down.length, 1);

      c.panMove(10, 0);
      await Future<void>.delayed(const Duration(milliseconds: 8));

      final move = bt.sent.where((b) => b[1] == 0x10).toList();
      expect(move, isNotEmpty);
      expect(move.last[10] & 0x01, 0x01); // left held during drag

      c.panLift();
      final up = bt.sent.where((b) => b[1] == 0x11 && b[7] == 0).toList();
      expect(up.length, 1);
    });

    test('scroll delta emits wheel packets', () async {
      final (c, bt) = await makeController();
      await c.init();
      c.openMouse();
      bt.setStatus(ConnectionStatus.connected);

      c.scrollDelta(-50);
      await Future<void>.delayed(const Duration(milliseconds: 8));

      final scroll = bt.sent.where((b) => b[1] == 0x12).toList();
      expect(scroll.length, 1);
      final dy = ByteData.sublistView(scroll.last).getInt16(8, Endian.little);
      expect(dy, -50);
      final len = scroll.last[4] | scroll.last[5] << 8;
      expect(len, 5);
    });
  });
}