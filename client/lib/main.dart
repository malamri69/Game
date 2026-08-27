import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Section 36: Mobile First, Portrait mode preferred.
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  runApp(const UnknownKingApp());
}

class UnknownKingApp extends StatelessWidget {
  const UnknownKingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'الملك المجهول',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
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
    );
  }
}
