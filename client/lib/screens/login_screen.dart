import 'package:flutter/material.dart';
import '../config.dart';
import '../l10n/app_strings.dart';
import '../services/locale_service.dart';
import '../services/socket_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _nameController = TextEditingController();
  bool _connecting = false;
  String? _error;

  Future<void> _enter(AppStrings s) async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = s.nameRequired);
      return;
    }
    setState(() {
      _connecting = true;
      _error = null;
    });
    try {
      await SocketService.instance.connect(kServerUrl, name).timeout(const Duration(seconds: 8));
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = s.connectionFailed;
        _connecting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final s = AppStrings(locale);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              // Section 58: chosen once, right at login, remembered after.
              Align(
                alignment: Alignment.topCenter,
                child: _LanguageToggle(isArabic: s.ar),
              ),
              const Spacer(),
              const Text('👑', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 12),
              Text(
                s.ar ? s.appNameArabic : s.appNameEnglish,
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                s.ar ? s.appNameEnglish : s.appNameArabic,
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _nameController,
                textAlign: TextAlign.center,
                decoration: InputDecoration(hintText: s.enterYourName, border: const OutlineInputBorder()),
                onSubmitted: (_) => _enter(s),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colors.redAccent)),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _connecting ? null : () => _enter(s),
                  child: _connecting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(s.enter),
                ),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class _LanguageToggle extends StatelessWidget {
  final bool isArabic;
  const _LanguageToggle({required this.isArabic});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(border: Border.all(color: Colors.white24), borderRadius: BorderRadius.circular(24)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LanguagePill(label: 'العربية', selected: isArabic, onTap: () => LocaleService.instance.setLocale(const Locale('ar'))),
          _LanguagePill(label: 'English', selected: !isArabic, onTap: () => LocaleService.instance.setLocale(const Locale('en'))),
        ],
      ),
    );
  }
}

class _LanguagePill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _LanguagePill({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? Theme.of(context).colorScheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Theme.of(context).colorScheme.onPrimary : Colors.white70,
          ),
        ),
      ),
    );
  }
}
