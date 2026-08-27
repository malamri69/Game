import 'package:flutter/material.dart';
import '../models/match_state.dart';
import '../services/socket_service.dart';
import 'home_screen.dart';

/// Section 40/66: never just "You Win" — and never dump the player back to
/// Home unless they choose to. The big ask here is the Rematch button.
class ResultScreen extends StatelessWidget {
  final MatchStateForViewer state;
  const ResultScreen({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
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
                result?.youWon == true ? 'فزت! 🎉' : 'انتهت المباراة',
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              if (state.ownRole != null)
                Text('دورك كان: ${state.ownRole!.name.ar}', style: const TextStyle(fontSize: 16, color: Colors.grey)),
              const SizedBox(height: 32),
              const Text('جاهز تنتقم؟ 😈', style: TextStyle(fontSize: 18)),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => SocketService.instance.requestRematch(),
                  child: const Text('🔄 العب مرة ثانية'),
                ),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => Navigator.of(context)
                    .pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomeScreen()), (route) => false),
                child: const Text('الرئيسية'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
