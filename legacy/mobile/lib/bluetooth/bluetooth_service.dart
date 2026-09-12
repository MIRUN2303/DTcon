import 'dart:typed_data';

/// Phone-side connection status, mapped to the four UX states the spec
/// demands plus the radio-off state.
enum ConnectionStatus {
  /// Bluetooth radio off / service never started.
  disconnected,

  /// Advertising, waiting for the PC to subscribe.
  searching,

  /// Subscribed; handshake in flight.
  connecting,

  /// Subscribed + handshake done; input flows.
  connected,

  /// Peer vanished (unsubscribed or PING/PONG timeout).
  lost,
}

extension ConnectionStatusLabel on ConnectionStatus {
  String get label => switch (this) {
        ConnectionStatus.disconnected => 'Off',
        ConnectionStatus.searching => 'Searching',
        ConnectionStatus.connecting => 'Connecting',
        ConnectionStatus.connected => 'Connected',
        ConnectionStatus.lost => 'Connection lost',
      };
}

/// BLE adapter facade. The real implementation talks to the phone's BLE
/// peripheral stack; the test double is a plain stream we control.
abstract class BluetoothService {
  /// Status changes. Always emits the current status on each listen.
  Stream<ConnectionStatus> get status;

  /// Human-readable transport log lines for the debug overlay.
  Stream<String> get log;

  bool get connected;

  /// Begin advertising (idempotent; safe to call repeatedly).
  Future<void> start();

  Future<void> stop();

  /// Queue one raw protocol packet for the peer.
  Future<bool> sendBytes(Uint8List bytes);
}