/// Canonical application-wide constants on the phone side.
///
/// Mirrors docs/protocol.md. Single source of truth lives in the docs; keep
/// this file byte-for-byte consistent with anything the Windows receiver uses.
library;

abstract final class AppConst {
  static const String appName = 'DTCON';
  static const String tagline = 'Wireless touchpad & joystick';
  static const String deviceLocalName = 'DTCON';

  /// Intro splash duration before the home screen.
  static const Duration introDuration = Duration(milliseconds: 1200);

  // ---- Touchpad tuning -----------------------------------------------------

  static const int defaultDpi = 800;
  static const int minDpi = 400;
  static const int maxDpi = 3200;
  static const int dpiStep = 200;

  static const double defaultScrollSensitivity = 1.0;
  static const double minScrollSensitivity = 0.5;
  static const double maxScrollSensitivity = 4.0;

  static const int maxI16 = 32767;

  /// Controller tick: flushes accumulated move/scroll deltas.
  static const Duration batcherTick = Duration(milliseconds: 8);

  /// Hold this long without moving to start a press-and-drag.
  static const Duration dragTrigger = Duration(milliseconds: 320);
}

abstract final class PrefsKeys {
  static const String modeOrder = 'mode_order';
  static const String dpi = 'dpi';
  static const String scrollSensitivity = 'scroll_sensitivity';
}