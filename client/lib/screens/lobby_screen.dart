import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../l10n/app_strings.dart';
import '../services/socket_service.dart';
import '../widgets/table_scene.dart';
import 'match_screen.dart';

/// Waiting room shown after Quick Match / private room creation, until the
/// server launches the match (bot backfill after a short wait, section 4 —
/// we deliberately never make a player stare at this for long). Staged as
/// a round table with hooded, faceless figures gathering around it — the
/// game's whole premise is that you don't know who anyone is yet, so the
/// waiting room should already feel that way.
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

  static const _s = AppStrings();

  @override
  Widget build(BuildContext context) {
    const s = _s;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("GATHERING AT THE TABLE", style: TextStyle(fontSize: 12, color: Colors.grey, letterSpacing: 1.5)),
              const SizedBox(height: 8),
              const TableScene(),
              const SizedBox(height: 8),
              Text(s.waitingForPlayers, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(s.botBackfillNote, textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey, fontSize: 12.5)),
              ),
              if (_code != null) ...[
                const SizedBox(height: 22),
                Text(s.roomCode, style: Theme.of(context).textTheme.labelMedium),
                const SizedBox(height: 4),
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: _code!));
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.codeCopied)));
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white24),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      _code!,
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, letterSpacing: 5, color: Color(0xFFC9A227)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
