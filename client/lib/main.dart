import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/login_screen.dart';
import 'services/locale_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Section 36: Mobile First, Portrait mode preferred.
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  // Load the saved language choice before the first frame, so the UI
  // never flashes Arabic and then jumps to English (or vice versa).
  await LocaleService.instance.load();
  runApp(const UnknownKingApp());
}

class UnknownKingApp extends StatelessWidget {
  const UnknownKingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Locale>(
      valueListenable: LocaleService.instance.locale,
      builder: (context, locale, _) => MaterialApp(
        title: 'الملك المجهول — The Unknown King',
        debugShowCheckedModeBanner: false,
        locale: locale,
        supportedLocales: const [Locale('ar'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFC9A227), brightness: Brightness.dark),
          scaffoldBackgroundColor: const Color(0xFF0F1115),
        ),
        home: const LoginScreen(),
      ),
    );
  }
}
