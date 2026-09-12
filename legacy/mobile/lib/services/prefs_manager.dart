import 'package:shared_preferences/shared_preferences.dart';

import '../core/app_const.dart';
import 'app_mode.dart';

/// Persists user settings across launches. Everything is a plain get/set on
/// SharedPreferences; no extra state mgmt.
class PrefsManager {
  PrefsManager(this._prefs);
  final SharedPreferences _prefs;

  List<AppMode> get modeOrder {
    final raw = _prefs.getString(PrefsKeys.modeOrder);
    if (raw == null) return AppMode.defaultOrder;
    final list = raw.split(',').map(AppMode.fromStorageKey).toList();
    // Guard against a corrupt/incomplete stored order.
    if (list.length == AppMode.values.length) return list;
    return AppMode.defaultOrder;
  }

  Future<void> setModeOrder(List<AppMode> order) => _prefs.setString(
      PrefsKeys.modeOrder, order.map((m) => m.storageKey).join(','));

  int get dpi => _prefs.getInt(PrefsKeys.dpi) ?? AppConst.defaultDpi;

  Future<void> setDpi(int value) => _prefs.setInt(PrefsKeys.dpi, value);

  double get scrollSensitivity =>
      _prefs.getDouble(PrefsKeys.scrollSensitivity) ??
      AppConst.defaultScrollSensitivity;

  Future<void> setScrollSensitivity(double value) =>
      _prefs.setDouble(PrefsKeys.scrollSensitivity, value);
}