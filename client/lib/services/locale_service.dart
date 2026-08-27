import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// App-wide language selection (section 58: Arabic first, English second —
/// chosen once, remembered across launches). Screens don't hold their own
/// copy of the language; they listen to `LocaleService.instance.locale`
/// (a ValueNotifier), so a change on the login screen's toggle propagates
/// to the whole app the moment MaterialApp rebuilds around it.
class LocaleService {
  LocaleService._();
  static final LocaleService instance = LocaleService._();

  static const _prefsKey = 'unknown_king_locale';

  final ValueNotifier<Locale> locale = ValueNotifier(const Locale('ar'));

  /// Call once before runApp() so the saved choice is in place from the
  /// very first frame — otherwise the UI would flash Arabic then switch.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_prefsKey);
    if (code == 'en') locale.value = const Locale('en');
  }

  Future<void> setLocale(Locale value) async {
    if (locale.value.languageCode == value.languageCode) return;
    locale.value = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, value.languageCode);
  }

  bool get isArabic => locale.value.languageCode == 'ar';
}
