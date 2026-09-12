import 'dart:typed_data';

import '../core/protocol_constants.dart';

/// Minimal decoder for inbound peer packets (HELLO_ACK / PONG).
///
/// Only the small set the phone reacts to is parsed into typed results; the
/// rest are rejected. The receiver owns the full decoder for every type.
class PacketDecoder {
  enum Result { helloAck, pong, other, invalid }

  static Result decode(Uint8List wire) {
    if (wire.length < 6 || wire[0] != ProtocolConst.version) {
      return Result.invalid;
    }
    final type = wire[1];
    final length = ByteData.sublistView(wire).getUint16(4, Endian.little);
    if (6 + length != wire.length) return Result.invalid;

    switch (type) {
      case ProtocolConst.typeHelloAck:
        return Result.helloAck;
      case ProtocolConst.typePong:
        return Result.pong;
      default:
        return Result.other;
    }
  }
}

/// Raw packet decode for tests/doc parity. Kept as pure functions.
Uint8List encodePacket(int type, {int sequence = 0, Uint8List? payload}) {
  final pl = payload ?? Uint8List(0);
  final out = Uint8List(6 + pl.length);
  final bd = out.buffer.asByteData();
  bd.setUint8(0, ProtocolConst.version);
  bd.setUint8(1, type);
  bd.setUint8(2, 0);
  bd.setUint8(3, sequence);
  bd.setUint16(4, pl.length, Endian.little);
  for (var i = 0; i < pl.length; i++) {
    out[6 + i] = pl[i];
  }
  return out;
}