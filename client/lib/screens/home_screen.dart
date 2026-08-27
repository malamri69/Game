import 'package:flutter/material.dart';
import '../l10n/app_strings.dart';
import '../services/socket_service.dart';
import 'lobby_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  void _quickMatch(BuildContext context) {
    SocketService.instance.quickMatch();
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LobbyScreen()));
  }

  void _privateRoom(BuildContext context, AppStrings s) {
    showModalBottomSheet(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton(
                onPressed: () {
                  Navigator.pop(sheetContext);
                  SocketService.instance.createPrivateRoom();
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LobbyScreen()));
                },
                child: Text(s.createRoom),
              ),
              const SizedBox(height: 12),
              _JoinByCodeField(
                hint: s.roomCodeHint,
                joinLabel: s.join,
                onJoin: (code) {
                  Navigator.pop(sheetContext);
                  SocketService.instance.joinByCode(code);
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LobbyScreen()));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _comingSoon(BuildContext context, String label) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(label)));
  }

  static const _s = AppStrings();

  @override
  Widget build(BuildContext context) {
    const s = _s;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('👑', style: TextStyle(fontSize: 56)),
                const SizedBox(height: 24),
                _MenuButton(label: s.playNow, onTap: () => _quickMatch(context), primary: true),
                const SizedBox(height: 12),
                _MenuButton(label: s.privateRoom, onTap: () => _privateRoom(context, s)),
                const SizedBox(height: 12),
                _MenuButton(label: s.leaderboard, onTap: () => _comingSoon(context, s.comingSoon(s.leaderboard))),
                const SizedBox(height: 12),
                _MenuButton(label: s.profile, onTap: () => _comingSoon(context, s.comingSoon(s.profile))),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final bool primary;
  const _MenuButton({required this.label, required this.onTap, this.primary = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 260,
      height: 52,
      child: primary
          ? FilledButton(onPressed: onTap, child: Text(label, style: const TextStyle(fontSize: 18)))
          : OutlinedButton(onPressed: onTap, child: Text(label, style: const TextStyle(fontSize: 16))),
    );
  }
}

class _JoinByCodeField extends StatefulWidget {
  final String hint;
  final String joinLabel;
  final void Function(String code) onJoin;
  const _JoinByCodeField({required this.hint, required this.joinLabel, required this.onJoin});

  @override
  State<_JoinByCodeField> createState() => _JoinByCodeFieldState();
}

class _JoinByCodeFieldState extends State<_JoinByCodeField> {
  final _controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(hintText: widget.hint, border: const OutlineInputBorder()),
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: () {
            final code = _controller.text.trim();
            if (code.isNotEmpty) widget.onJoin(code);
          },
          child: Text(widget.joinLabel),
        ),
      ],
    );
  }
}
