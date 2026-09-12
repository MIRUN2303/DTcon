import 'dart:math';

import '../core/app_const.dart';

/// Translates raw trackpad movement (logical px, in [dx, dy]) into mouse
/// deltas, applying DPI scale and a speed-based acceleration curve.
///
/// Kept pure and deterministic so tests can lock the numbers down.
class GestureEngine {
  GestureEngine({int dpi = AppConst.defaultDpi}) : _dpi = dpi;

  int _dpi;
  int get dpi => _dpi;
  set dpi(int value) {
    _dpi = value.clamp(AppConst.minDpi, AppConst.maxDpi);
  }

  /// [dtSeconds] is the elapsed time since the previous frame.
  CursorDelta cursorDelta(double dx, double dy, double dtSeconds) {
    if (dx == 0 && dy == 0) return const CursorDelta(0, 0);

    final speedPxPerSec = sqrt(dx * dx + dy * dy) / (dtSeconds <= 0 ? 1 : dtSeconds);
    final accel = _acceleration(speedPxPerSec);
    final scale = (_dpi / AppConst.defaultDpi) * accel;

    final outX = (dx * scale).round();
    final outY = (dy * scale).round();
    return CursorDelta(
      outX.clamp(-AppConst.maxI16, AppConst.maxI16),
      outY.clamp(-AppConst.maxI16, AppConst.maxI16),
    );
  }

  /// Occupancy curve: near-zero velocity stays slow/precise (~0.9), fast
  /// flicks reach ~3.0. A single sqrt blend keeps low-speed movements steady
  /// instead of jumpy.
  double _acceleration(double speedPxPerSec) {
    const floor = 0.9;
    const ceiling = 3.0;
    final norm = (speedPxPerSec / 2800.0).clamp(0.0, 1.0);
    return floor + (ceiling - floor) * sqrt(norm);
  }

  /// Scroll wheel emulation multiplier. [sensitivity] is 0.5..4.0.
  int scrollDelta(double raw, double sensitivity) =>
      (raw * sensitivity).round().clamp(-AppConst.maxI16, AppConst.maxI16);
}

class CursorDelta {
  const CursorDelta(this.dx, this.dy);
  final int dx;
  final int dy;

  @override
  String toString() => '($dx,$dy)';
}