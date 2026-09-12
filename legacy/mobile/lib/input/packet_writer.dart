import 'dart:typed_data';

import '../core/protocol_constants.dart';

/// Builds 6-byte-header packets. Owns the outgoing sequence counter.
///
/// Sequence wraps at 0xFF and the receiver uses a signed delta (<= half a
/// byte means "newer"), so wrap-around is handled by the peer as long as we
/// never send more than 127 packets without an in-flight ack window. We
/// don't track acks (fire-and-forget per spec), so keep the rate reasonable:
/// the move batcher caps this well below that.
class PacketWriter {
  int _sequence = 0;

  Uint8List ping() => _build(ProtocolConst.typePing);

  Uint8List pong() => _build(ProtocolConst.typePong);

  Uint8List hello() => _build(ProtocolConst.typeHello);

  Uint8List disconnect({int reason = 0}) =>
      _build(ProtocolConst.typeDisconnect, payload: Uint8List.fromList([reason]));

  Uint8List mouseMove({required int dx, required int dy, required int buttons}) {
    final p = Uint8List(6);
    p.buffer.asByteData().setInt16(0, dx, Endian.little);
    p.buffer.asByteData().setInt16(2, dy, Endian.little);
    p[4] = buttons;
    p[5] = 0; // flags
    return _build(ProtocolConst.typeMouseMove, payload: p);
  }

  Uint8List mouseButton({required int button, required int pressed}) =>
      _build(ProtocolConst.typeMouseButton,
          payload: Uint8List.fromList([button, pressed]));

  Uint8List mouseScroll({required int dx, required int dy, int flags = 0}) {
    final p = Uint8List(5);
    p.buffer.asByteData().setInt16(0, dx, Endian.little);
    p.buffer.asByteData().setInt16(2, dy, Endian.little);
    p[4] = flags;
    return _build(ProtocolConst.typeMouseScroll, payload: p);
  }

  Uint8List mouseNav(int action) =>
      _build(ProtocolConst.typeMouseNav, payload: Uint8List.fromList([action]));

  Uint8List _build(int type, {Uint8List? payload}) {
    final pl = payload ?? Uint8List(0);
    final wire = Uint8List(6 + pl.length);
    final bd = wire.buffer.asByteData();
    bd.setUint8(0, ProtocolConst.version);
    bd.setUint8(1, type);
    bd.setUint8(2, 0); // flags: fire-and-forget, no acks for input
    bd.setUint8(3, _sequence & 0xFF);
    bd.setUint16(4, pl.length, Endian.little);
    for (var i = 0; i < pl.length; i++) {
      wire[6 + i] = pl[i];
    }
    _sequence = (_sequence + 1) & 0xFF;
    return wire;
  }
}