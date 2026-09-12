import 'package:dtcon/input/gesture_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('GestureEngine', () {
    test('zero input yields zero delta', () {
      final e = GestureEngine();
      final d = e.cursorDelta(0, 0, 0.016);
      expect(d.dx, 0);
      expect(d.dy, 0);
    });

    test('default DPI is identity-ish scale for slow move', () {
      // A slow, small movement stays near 1:1 (floored to 0.9).
      final d = GestureEngine().cursorDelta(4, 3, 0.3);
      expect(d.dx, (4 * 0.9).round());
      expect(d.dy, (3 * 0.9).round());
    });

    test('higher DPI scales up proportionally', () {
      final low = GestureEngine(dpi: 400).cursorDelta(50, 0, 0.05);
      final high = GestureEngine(dpi: 1600).cursorDelta(50, 0, 0.05);
      expect(high.dx, greaterThan(low.dx));
    });

    test('faster movement accelerates', () {
      final slow = GestureEngine().cursorDelta(10, 0, 0.5); // 20 px/s
      final fast = GestureEngine().cursorDelta(10, 0, 0.01); // 1000 px/s
      expect(fast.dx, greaterThan(slow.dx));
    });

    test('deltas clamp to int16', () {
      final d = GestureEngine().cursorDelta(100000, 100000, 0.001);
      expect(d.dx, lessThanOrEqualTo(32767));
      expect(d.dy, greaterThanOrEqualTo(-32768));
    });

    test('dpi clamps to config range', () {
      final e = GestureEngine(dpi: 10);
      expect(e.dpi, 400);
      e.dpi = 99999;
      expect(e.dpi, 3200);
    });

    test('scroll sensitivity scales and flips sign correctly', () {
      final e = GestureEngine();
      expect(e.scrollDelta(120, 1.0), 120);
      expect(e.scrollDelta(120, 2.0), 240);
      expect(e.scrollDelta(-60, 0.5), -30);
    });
  });
}