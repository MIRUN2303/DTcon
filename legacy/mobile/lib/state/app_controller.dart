import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart' show Offset;
import 'package:flutter/services.dart';

import '../bluetooth/bluetooth_service.dart';
import '../core/app_const.dart';
import '../core/debug_log.dart';
import '../core/protocol_constants.dart';
import '../input/gesture_engine.dart';
import '../input/move_batcher.dart';
import '../input/packet_writer.dart';
import '../services/app_mode.dart';
import '../services/prefs_manager.dart';

/// High-level UI pages.
enum AppPage { intro, home, mouse, joystick }

/// Owns app state and the whole gesture→packet pipeline. Pure Dart + a
/// couple of flutter pieces (ChangeNotifier, Timer, haptics hook), so it is
/// unit-testable without a device.
class AppController extends ChangeNotifier {
  AppController({
    required PrefsManager prefs,
    required BluetoothService bluetooth,
    required this.mouseHostEnabled,
    void Function()? onHaptic,
  })  : _prefs = prefs,
        _bt = bluetooth,
        onHaptic = onHaptic ?? () => HapticFeedback.lightImpact(),
        _engine = GestureEngine() {
    _writer = PacketWriter();
    _batcher = MoveBatcher(
      onMoveFrame: _emitMove,
      onScrollFrame: _emitScroll,
    );
    _bt.status.listen(_onStatus);
  }

  final PrefsManager _prefs;
  final BluetoothService _bt;
  final GestureEngine _engine;
  final void Function() onHaptic;

  /// True on the real BLE-backed host; false in tests/doubles.
  final bool mouseHostEnabled;

  /// True when the mouse page actually delivers input.
  late final PacketWriter _writer;
  late final MoveBatcher _batcher;
  Timer? _tick;
  Timer? _dragTimer;

  AppPage _page = AppPage.intro;
  AppPage get page => _page;

  ConnectionStatus _connection = ConnectionStatus.disconnected;
  ConnectionStatus get connection => _connection;

  bool get connected => _bt.connected;

  List<AppMode> _modeOrder = AppMode.defaultOrder;
  List<AppMode> get modeOrder => List.unmodifiable(_modeOrder);

  int get dpi => _engine.dpi;

  double _scrollSensitivity = AppConst.defaultScrollSensitivity;
  double get scrollSensitivity => _scrollSensitivity;

  int _heldButtons = 0;
  int get heldButtons => _heldButtons;

  // ---- gesture telemetry ------------------------------------------------
  int _lastGestureTimeMs = 0;
  Offset _contact = Offset.zero;
  bool _dragEngaged = false;

  Future<void> init() async {
    _modeOrder = _prefs.modeOrder;
    _engine.dpi = _prefs.dpi;
    _scrollSensitivity = _prefs.scrollSensitivity;
    return null;
  }

  // ---------------- navigation -------------------------------------------

  void finishIntro() {
    _page = AppPage.home;
    notifyListeners();
  }

  void goHome() {
    _setPage(AppPage.home);
  }

  void openMouse() {
    if (mouseHostEnabled) _bt.start();
    _setPage(AppPage.mouse);
  }

  void openJoystick() {
    _setPage(AppPage.joystick);
  }

  void _setPage(AppPage value) {
    if (_page == value) return;
    _page = value;
    if (value == AppPage.mouse) {
      _tick ??= Timer.periodic(AppConst.batcherTick, (_) => _batcher.flush());
    } else {
      _tick?.cancel();
      _tick = null;
      _dragDisarm();
      _batcher.reset();
    }
    notifyListeners();
  }

  // ---------------- prefs-backed settings --------------------------------

  void setDpi(int value) {
    final clamped = value.clamp(AppConst.minDpi, AppConst.maxDpi);
    if (clamped == _engine.dpi) return;
    _engine.dpi = clamped;
    _prefs.setDpi(clamped);
    notifyListeners();
  }

  void adjustDpi(int delta) => setDpi(dpi + delta * AppConst.dpiStep);

  void resetDpi() => setDpi(AppConst.defaultDpi);

  void setScrollSensitivity(double value) {
    final clamped =
        value.clamp(AppConst.minScrollSensitivity, AppConst.maxScrollSensitivity);
    if (clamped == _scrollSensitivity) return;
    _scrollSensitivity = clamped;
    _prefs.setScrollSensitivity(clamped);
    notifyListeners();
  }

  // ---------------- mode order -------------------------------------------

  void setModeOrder(List<AppMode> order) {
    _modeOrder = List.of(order);
    _prefs.setModeOrder(_modeOrder);
    notifyListeners();
  }

  void swapModeCards() {
    setModeOrder(_modeOrder.reversed.toList());
  }

  // ---------------- connection -------------------------------------------

  void _onStatus(ConnectionStatus value) {
    _connection = value;
    switch (value) {
      case ConnectionStatus.connected:
        DebugLog.info('Connected.');
        break;
      case ConnectionStatus.lost:
        DebugLog.info('Connection lost — searching again.');
        break;
      default:
        break;
    }
    notifyListeners();
  }

  void reconnect() {
    if (!_bt.connected) _bt.start();
  }

  // ---------------- touchpad gesture funnel ------------------------------

  /// Call from onPanStart/down: arm the press-and-drag trigger.
  void panContact(double x, double y) {
    _contact = Offset(x, y);
    _lastGestureTimeMs = 0;
    _dragTimer?.cancel();
    _dragTimer = Timer(AppConst.dragTrigger, () {
      _dragTimer = null;
      if (!_dragEngaged) {
        _dragEngaged = true;
        _press(ProtocolConst.btnLeft);
      }
    });
  }

  /// Call from onPanUpdate with this frame's raw movement (logical px).
  void panMove(double dx, double dy) {
    final now = DateTime.now().millisecondsSinceEpoch;
    var dt = (now - _lastGestureTimeMs) / 1000.0;
    if (_lastGestureTimeMs == 0) dt = AppConst.batcherTick.inMilliseconds / 1000.0;
    _lastGestureTimeMs = now;

    if (!_dragEngaged) {
      // Any real movement cancels the click/drag classification; it is a
      // pure cursor move now. Threshold mirrors Flutter's kTouchSlop.
      final pos = _contact + Offset(dx, dy);
      if ((pos - _contact).distance > 18.0) {
        _dragTimer?.cancel();
        _dragTimer = null;
      }
    }

    final scaled = _engine.cursorDelta(dx, dy, dt);
    _batcher.addMove(scaled.dx, scaled.dy);
  }

  /// Call from onPanEnd/onPanCancel.
  void panLift() {
    _dragDisarm();
    _lastGestureTimeMs = 0;
  }

  void _dragDisarm() {
    _dragTimer?.cancel();
    _dragTimer = null;
    if (_dragEngaged) {
      _dragEngaged = false;
      _release(ProtocolConst.btnLeft);
    }
  }

  /// Tap anywhere on the pad → left click (double-tap works naturally, two
  /// clicks are re-fused by the OS into a double-click).
  void tapClick() {
    // A tap-down may have armed the hold-drag trigger; a real tap must cancel
    // it or the late fire would press-and-stick the left button.
    _dragTimer?.cancel();
    _dragTimer = null;
    onHaptic();
    _press(ProtocolConst.btnLeft);
    _release(ProtocolConst.btnLeft);
  }

  /// The bottom strip's right zone.
  void secondaryClick() {
    onHaptic();
    _press(ProtocolConst.btnRight);
    _release(ProtocolConst.btnRight);
  }

  /// Scroll zone drag. [dy] raw logical px (up = positive from GestureDetector
  /// vertical drag is actually opposite; the widget normalizes).
  void scrollDelta(double dy) {
    final scaled = _engine.scrollDelta(dy, _scrollSensitivity);
    if (scaled != 0) _batcher.addScroll(0, scaled);
  }

  void nav(NavAction action) {
    if (_bt.connected) {
      _send(_writer.mouseNav(action.index));
    }
  }

  // ---------------- packet emit ------------------------------------------

  void _press(int button) {
    _heldButtons |= button;
    if (_bt.connected) _send(_writer.mouseButton(button: button, pressed: 1));
  }

  void _release(int button) {
    if ((_heldButtons & button) == 0) return;
    _heldButtons &= ~button;
    if (_bt.connected) _send(_writer.mouseButton(button: button, pressed: 0));
  }

  void _emitMove(int dx, int dy) {
    if (!_bt.connected) return;
    _send(_writer.mouseMove(dx: dx, dy: dy, buttons: _heldButtons));
  }

  void _emitScroll(int dx, int dy) {
    if (!_bt.connected) return;
    _send(_writer.mouseScroll(dx: dx, dy: dy));
  }

  void _send(Uint8List wire) {
    _bt.sendBytes(wire);
  }

  @override
  void dispose() {
    _tick?.cancel();
    _dragTimer?.cancel();
    super.dispose();
  }
}