import '../core/app_const.dart';

/// Coalesces raw gesture deltas into a steady outbound frame stream.
///
/// The [AppController] owns a [Timer.periodic] at [AppConst.batcherTick];
/// each tick flushes however much moved since the last tick. When nothing
/// moved we send nothing — silent trackpads don't flood the BLE pipe.
///
/// Deltas are consumer-ready (already scaled+clamped by GestureEngine), so
/// this class is just add-and-drain plus i16 saturation so we never emit a
/// delta the receiver can't represent.
class MoveBatcher {
  MoveBatcher({
    required void Function(int dx, int dy) onMoveFrame,
    required void Function(int dx, int dy) onScrollFrame,
  })  : _onMove = onMoveFrame,
        _onScroll = onScrollFrame;

  final void Function(int dx, int dy) _onMove;
  final void Function(int dx, int dy) _onScroll;

  int _moveX = 0;
  int _moveY = 0;
  int _scrollX = 0;
  int _scrollY = 0;

  bool get pending => _moveX != 0 || _moveY != 0 || _scrollX != 0 || _scrollY != 0;

  /// Add move deltas (already DPI/accel-scaled). Clamped to i16.
  void addMove(int dx, int dy) {
    _moveX = _sat(_moveX + dx);
    _moveY = _sat(_moveY + dy);
  }

  /// Add scroll deltas (already sensitivity-scaled). Clamped to i16.
  void addScroll(int dx, int dy) {
    _scrollX = _sat(_scrollX + dx);
    _scrollY = _sat(_scrollY + dy);
  }

  void reset() {
    _moveX = 0;
    _moveY = 0;
    _scrollX = 0;
    _scrollY = 0;
  }

  /// Emit one move frame (if any), then one scroll frame (if any).
  void flush() {
    final mx = _moveX;
    final my = _moveY;
    if (mx != 0 || my != 0) {
      _onMove(mx, my);
      _moveX = 0;
      _moveY = 0;
    }
    final sx = _scrollX;
    final sy = _scrollY;
    if (sx != 0 || sy != 0) {
      _onScroll(sx, sy);
      _scrollX = 0;
      _scrollY = 0;
    }
  }

  int _sat(int v) => v.clamp(-AppConst.maxI16, AppConst.maxI16);
}