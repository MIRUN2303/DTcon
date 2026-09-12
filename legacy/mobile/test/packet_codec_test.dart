import 'dart:typed_data';

import 'package:dtcon/input/packet_decoder.dart';
import 'package:dtcon/input/packet_writer.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PacketWriter', () {
    test('hello is a header-only packet', () {
      final p = PacketWriter().hello();
      expect(p.length, 6);
      expect(p[0], 0x01); // version
      expect(p[1], 0x01); // hello
      expect(p[4], 0); // length low
      expect(p[5], 0); // length high
    });

    test('mouse move carries dx/dy/buttons little-endian', () {
      final p = PacketWriter().mouseMove(dx: -320, dy: 12345, buttons: 0x0B);
      final bd = ByteData.sublistView(p);
      expect(bd.getInt16(6, Endian.little), -320);
      expect(bd.getInt16(8, Endian.little), 12345);
      expect(p[10], 0x0B);
      expect(p[11], 0x00); // flags
    });

    test('scroll carries dx/dy/flags', () {
      final p = PacketWriter().mouseScroll(dx: 40, dy: -120, flags: 1);
      expect(ByteData.sublistView(p).getInt16(6, Endian.little), 40);
      expect(ByteData.sublistView(p).getInt16(8, Endian.little), -120);
      expect(p[10], 0x01);
    });

    test('sequence increments and wraps at 0xFF', () {
      final w = PacketWriter();
      final first = w.ping();
      expect(first[3], 0);
      // writer seq is now 1; 255 more sends pushes it back to 0.
      for (var i = 0; i < 255; i++) {
        w.ping();
      }
      expect(w.ping()[3], 0);
    });

    test('packets stay inside the 20-byte ATT payload budget', () {
      // 6-byte header + 14-byte payload = a full ATT write; anything larger
      // would need MTU escalation. The biggest input type fits.
      final p = PacketWriter().mouseMove(dx: 32767, dy: -32768, buttons: 0xFF);
      expect(p.length, 6 + 6); // move payload is dx/dy/buttons/flags
      expect(p.length, lessThanOrEqualTo(20));
    });
  });

  group('PacketDecoder', () {
    test('helloAck recognized', () {
      final wire = encodePacket(0x02);
      expect(PacketDecoder.decode(wire), PacketDecoder.Result.helloAck);
    });

    test('pong recognized', () {
      final wire = encodePacket(0x04);
      expect(PacketDecoder.decode(wire), PacketDecoder.Result.pong);
    });

    test('rejects bad version', () {
      final wire = Uint8List.fromList([0x02, 0x02, 0, 0, 0, 0]);
      expect(PacketDecoder.decode(wire), PacketDecoder.Result.invalid);
    });

    test('rejects truncated packet', () {
      expect(PacketDecoder.decode(Uint8List.fromList([0x01, 0x01])),
          PacketDecoder.Result.invalid);
    });

    test('rejects length mismatch', () {
      // claims length 99 but has no payload
      final wire = Uint8List.fromList([0x01, 0x02, 0, 0, 99, 0]);
      expect(PacketDecoder.decode(wire), PacketDecoder.Result.invalid);
    });
  });
}