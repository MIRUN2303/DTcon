import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';

import '../core/app_const.dart';
import '../core/debug_log.dart';
import '../core/protocol_constants.dart';
import '../input/packet_decoder.dart';
import '../input/packet_writer.dart';
import 'bluetooth_service.dart';

/// The phone side of the link: advertises the DTCON GATT service over BLE
/// and pumps protocol packets to the Windows receiver.
///
/// Packet contract (docs/protocol.md):
///  - phone is the peripheral; PC is central and subscribes to
///    [ProtocolConst.txUuid]; phone sends HELLO on first subscription.
///  - phone keeps a PING alive every [ProtocolConst.pingInterval] and
///    declares the link lost after [ProtocolConst.pingTimeout] without a
///    PONG (or when the PC unsubscribes), then automatically re-advertises.
///  - RX writes (HELLO_ACK / PONG) arrive via [onDataReceived].
class BlePeripheralService implements BluetoothService {
  final FlutterBlePeripheral _peripheral = FlutterBlePeripheral();
  final PacketWriter _writer = PacketWriter();

  final StreamController<ConnectionStatus> _status =
      StreamController<ConnectionStatus>.broadcast();
  final StreamController<String> _log = StreamController<String>.broadcast();

  final List<StreamSubscription<dynamic>> _subs = [];
  Timer? _heartbeat;
  DateTime _lastReply = DateTime.now();
  ConnectionStatus _statusValue = ConnectionStatus.disconnected;
  bool _started = false;

  @override
  bool get connected => _statusValue == ConnectionStatus.connected;

  @override
  Stream<ConnectionStatus> get status => _status.stream;

  @override
  Stream<String> get log => _log.stream;

  @override
  Future<void> start() async {
    if (_started) return;
    _started = true;

    bool granted;
    try {
      granted = await _peripheral.hasPermission() ||
          await _peripheral.requestPermission();
    } catch (_) {
      granted = false;
    }
    if (!granted) {
      _started = false;
      _set(ConnectionStatus.disconnected);
      _log('Bluetooth permission denied.');
      return;
    }

    try {
      await _peripheral.stop(); // clean slate from a previous session
      final state = await _peripheral.start(
        advertiseData: AdvertiseDataCore(
          serviceUuid: ProtocolConst.serviceUuid,
          localName: AppConst.deviceLocalName,
        ),
        gattServer: GattServerSettings(
          serviceUuid: ProtocolConst.serviceUuid,
          txCharacteristicUuid: ProtocolConst.txUuid,
          rxCharacteristicUuid: ProtocolConst.rxUuid,
        ),
      );

      if (state != PeripheralBluetoothState.ready) {
        _started = false;
        _set(ConnectionStatus.disconnected);
        _log('Advertising failed (state ${state.name}).');
        return;
      }

      _listen();
      _set(ConnectionStatus.searching);
      _heartbeat = Timer.periodic(ProtocolConst.pingInterval, (_) => _tick());
      _log('Advertising as ${AppConst.deviceLocalName} …');
    } catch (e) {
      _started = false;
      _set(ConnectionStatus.disconnected);
      _log('BLE start error: $e');
    }
  }

  void _listen() {
    _subs.add(_peripheral.onSubscriptionChanged.listen((subscribed) {
      _lastReply = DateTime.now();
      if (subscribed) {
        _set(ConnectionStatus.connecting);
        _log('PC subscribed — handshaking.');
        _send(_writer.hello());
      } else {
        _sessionEnd('PC unsubscribed.');
      }
    }));

    _subs.add(_peripheral.onDataReceived.listen((Uint8List bytes) {
      _lastReply = DateTime.now();
      switch (PacketDecoder.decode(bytes)) {
        case PacketDecoder.Result.helloAck:
          _set(ConnectionStatus.connected);
          _log('Handshake OK — input active.');
          break;
        case PacketDecoder.Result.pong:
        case PacketDecoder.Result.other:
          break;
        case PacketDecoder.Result.invalid:
          _log('Ignored ${bytes.length} bad bytes from PC.');
      }
    }));
  }

  void _tick() {
    switch (_statusValue) {
      case ConnectionStatus.connected:
        if (DateTime.now().difference(_lastReply) > ProtocolConst.pingTimeout) {
          _sessionEnd('No PONG for ${ProtocolConst.pingTimeout.inSeconds}s.');
          break;
        }
        _send(_writer.ping());
        break;
      case ConnectionStatus.searching:
      case ConnectionStatus.connecting:
        _send(_writer.ping()); // gentle knock in case handshake was missed
        break;
      case ConnectionStatus.disconnected:
      case ConnectionStatus.lost:
        break;
    }
  }

  void _sessionEnd(String why) {
    _log(why);
    _heartbeat?.cancel();
    _heartbeat = null;
    _set(ConnectionStatus.lost);
    onRestart?.call();
    if (_started) {
      // Re-advertise so the PC can simply reconnect — no user action.
      _started = false;
      start();
    }
  }

  /// Hook so the controller can keep its UI in sync across a restart.
  void Function()? onRestart;

  @override
  Future<void> stop() async {
    _heartbeat?.cancel();
    _heartbeat = null;
    for (final s in _subs) {
      await s.cancel();
    }
    _subs.clear();
    _started = false;
    try {
      await _peripheral.stop();
    } catch (_) {}
    _set(ConnectionStatus.disconnected);
    _log('Stopped.');
  }

  @override
  Future<bool> sendBytes(Uint8List bytes) => _send(bytes);

  Future<bool> _send(Uint8List bytes) async {
    // Peer must be subscribed (searching/connecting/connected) to receive;
    // the handshake HELLO goes out while "connecting", before we're
    // formally connected.
    if (_statusValue == ConnectionStatus.disconnected ||
        _statusValue == ConnectionStatus.lost) {
      return false;
    }
    try {
      await _peripheral.sendData(bytes);
      return true;
    } catch (e) {
      _log('Send failed: $e');
      return false;
    }
  }

  void _set(ConnectionStatus value) {
    _statusValue = value;
    _status.add(value);
  }

  void _log(String line) {
    DebugLog.info(line);
    _log.add(line);
  }
}