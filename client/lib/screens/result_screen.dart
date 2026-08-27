import 'package:flutter/material.dart';
import '../l10n/app_strings.dart';
import '../models/match_state.dart';
import '../services/socket_service.dart';
import 'home_screen.dart';

/// Section 40/66: never just "You Win" — and never dump the player back to
/// Home unless they choose to. The big ask here is the Rematch button.
class ResultScreen extends StatelessWidget {
  final MatchStateForViewer state;
  const ResultScreen({super.key, required this.state});

  static const _s = AppStrings();

  @override
  Widget build(BuildContext context) {
    const s = _s;
    final result = state.result;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(result?.youWon == true ? '🏆' : '👑', style: const TextStyle(fontSize: 64)),
              const SizedBox(height: 12),
              Text(
                result?.youWon == true ? s.youWon : s.matchOver,
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              if (state.ownRole != null)
                Text('${s.yourRoleWasPrefix}${state.ownRole!.name.en}', style: const TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 32),
              Text(s.readyForRevenge, style: const TextStyle(fontSize: 18)),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => SocketService.instance.requestRematch(),
                  child: Text(s.rematch),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.of(context)
                    .pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomeScreen()), (route) => false),
                child: Text(s.home),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
