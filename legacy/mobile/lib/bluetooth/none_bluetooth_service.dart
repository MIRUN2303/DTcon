import 'dart:async';
import 'dart:typed_data';

import 'bluetooth_service.dart';

/// Transport stub for tests and non-BLE hosts.
///
/// Saves every outbound packet; lets tests push inbound packets and status
/// transitions straight through the same streams the UI listens to.
class NoneBluetoothService implements BluetoothService {
  final StreamController<ConnectionStatus> _status =
      StreamController<ConnectionStatus>.broadcast();
  final StreamController<String> _log = StreamController<String>.broadcast();

  final List<Uint8List> sent = [];
  ConnectionStatus _value = ConnectionStatus.disconnected;

  @override
  bool get connected => _value == ConnectionStatus.connected;

  @override
  Stream<ConnectionStatus> get status {
    scheduleMicrotask(() {
      if (!_status.isClosed) _status.add(_value);
    });
    return _status.stream;
  }

  @override
  Stream<String> get log => _log.stream;

  @override
  Future<void> start() async {
    _value = ConnectionStatus.searching;
    _status.add(_value);
  }

  @override
  Future<void> stop() async {
    _value = ConnectionStatus.disconnected;
    _status.add(_value);
  }

  @override
  Future<bool> sendBytes(Uint8List bytes) async {
    sent.add(bytes);
    return true;
  }

  void setStatus(ConnectionStatus value) {
    _value = value;
    _status.add(value);
  }
}