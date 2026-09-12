import 'dart:developer' as developer;

/// Lightweight in-app logger. In debug builds also forwards to the Flutter
/// console; in release only surfaces in the on-screen Log panel.
abstract final class DebugLog {
  static final List<String> _lines = [];
  static const int _maxLines = 120;
  static void Function(String line)? onLine;

  static void info(String message) {
    final line = '${_hms(DateTime.now())}  $message';
    _lines.add(line);
    if (_lines.length > _maxLines) _lines.removeAt(0);
    onLine?.call(line);
    if (const bool.fromEnvironment('dart.vm.product')) {
      return;
    }
    developer.log(message, name: 'dtcon');
  }

  static List<String> get lines => List.unmodifiable(_lines);

  static String _hms(DateTime t) {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(t.hour)}:${two(t.minute)}:${two(t.second)}';
  }
}