import 'package:flutter/material.dart';
import '../models/match_state.dart';

/// Section 38: avatar, name, trust indicator — never a role. Whether the
/// seat behind this card is a bot is never surfaced (section 5).
class PlayerCard extends StatelessWidget {
  final PublicPlayerView player;
  final bool isSelf;
  final VoidCallback? onTap;

  const PlayerCard({super.key, required this.player, this.isSelf = false, this.onTap});

  Color get _trustColor {
    switch (player.trustIndicator) {
      case 'green':
        return Colors.greenAccent;
      case 'red':
        return Colors.redAccent;
      default:
        return Colors.amberAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: player.alive ? 1.0 : 0.35,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 84,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            border: Border.all(color: isSelf ? Colors.amber : Colors.white24),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              CircleAvatar(radius: 22, child: Text(player.displayName.isNotEmpty ? player.displayName[0] : '?')),
              const SizedBox(height: 4),
              Text(player.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 2),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(width: 8, height: 8, decoration: BoxDecoration(color: _trustColor, shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text('${player.gold}💰', style: const TextStyle(fontSize: 10)),
                ],
              ),
              if (!player.connected) const Text('انقطع', style: TextStyle(fontSize: 9, color: Colors.orangeAccent)),
              if (!player.alive) const Text('خرج', style: TextStyle(fontSize: 9, color: Colors.redAccent)),
            ],
          ),
        ),
      ),
    );
  }
}
