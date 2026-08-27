import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/socket_service.dart';
import 'match_screen.dart';

/// Waiting room shown after Quick Match / private room creation, until the
/// server launches the match (bot backfill after a short wait, section 4 —
/// we deliberately never make a player stare at this for long).
class LobbyScreen extends StatefulWidget {
  const LobbyScreen({super.key});

  @override
  State<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends State<LobbyScreen> {
  String? _code;
  late final StreamSubscription _lobbySub;
  late final StreamSubscription _stateSub;

  @override
  void initState() {
    super.initState();
    _code = SocketService.instance.lastLobbyCode;
    _lobbySub = SocketService.instance.lobbyJoined.listen((code) {
      if (mounted) setState(() => _code = code);
    });
    _stateSub = SocketService.instance.matchState.listen((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MatchScreen()));
    });
  }

  @override
  void dispose() {
    _lobbySub.cancel();
    _stateSub.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              const Text('بانتظار اللاعبين…', style: TextStyle(fontSize: 18)),
              const SizedBox(height: 8),
              const Text('لو ما اكتمل العدد، الذكاء الاصطناعي بيكمّل المكان 🤖', style: TextStyle(color: Colors.grey)),
              if (_code != null) ...[
                const SizedBox(height: 24),
                Text('كود الغرفة', style: Theme.of(context).textTheme.labelMedium),
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: _code!));
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم نسخ الكود')));
                  },
                  child: Text(_code!, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 4)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
