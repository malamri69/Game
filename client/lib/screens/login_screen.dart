import 'package:flutter/material.dart';
import '../config.dart';
import '../l10n/app_strings.dart';
import '../services/socket_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static const _s = AppStrings();
  final _nameController = TextEditingController();
  bool _connecting = false;
  String? _error;

  Future<void> _enter() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = _s.nameRequired);
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
        _error = _s.connectionFailed;
        _connecting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('👑', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 12),
              Text(_s.appName, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 32),
              TextField(
                controller: _nameController,
                textAlign: TextAlign.center,
                decoration: InputDecoration(hintText: _s.enterYourName, border: const OutlineInputBorder()),
                onSubmitted: (_) => _enter(),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: Colors.redAccent)),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _connecting ? null : _enter,
                  child: _connecting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(_s.enter),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
