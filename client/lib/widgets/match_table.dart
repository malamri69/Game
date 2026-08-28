import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../models/match_state.dart';

/// The match's round table (chosen direction "B — Round Table" from the
/// design mockup, section: match screen options). Carries the lobby's
/// table straight into the match itself: real names/trust/gold instead of
/// hooded mystery figures (role identity stays hidden, but who's *at* the
/// table isn't a secret), and — the point of this direction — picking a
/// secret-action target means tapping a seat, not a separate chip list.
class MatchTable extends StatefulWidget {
  final List<PublicPlayerView> players;
  final String selfSeatId;
  final bool selectable;
  final void Function(String seatId)? onSeatTap;

  const MatchTable({super.key, required this.players, required this.selfSeatId, this.selectable = false, this.onSeatTap});

  static const double width = 340;
  static const double height = 340;
  static const double _cx = width / 2;
  static const double _cy = height / 2 - 4;
  static const double _rx = 128;
  static const double _ry = 76;

  @override
  State<MatchTable> createState() => _MatchTableState();
}

class _MatchTableState extends State<MatchTable> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 4))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Rotates the roster so the human seat always renders at the bottom
  /// (nearest the viewer), keeping everyone else's relative order.
  List<PublicPlayerView> get _ordered {
    final players = widget.players;
    final selfIndex = players.indexWhere((p) => p.seatId == widget.selfSeatId);
    if (selfIndex <= 0) return players;
    return [...players.sublist(selfIndex), ...players.sublist(0, selfIndex)];
  }

  static Offset _seatCenter(int index, int total) {
    final angleDeg = 90 + index * (360 / total);
    final rad = angleDeg * math.pi / 180;
    return Offset(
      MatchTable._cx + MatchTable._rx * math.cos(rad),
      MatchTable._cy + MatchTable._ry * math.sin(rad),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ordered = _ordered;
    final total = ordered.length;
    return SizedBox(
      width: MatchTable.width,
      height: MatchTable.height,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final pulse = 0.55 + 0.45 * (0.5 + 0.5 * math.sin(_controller.value * 2 * math.pi));
          return Stack(
            children: [
              CustomPaint(
                size: const Size(MatchTable.width, MatchTable.height),
                painter: _MatchTablePainter(players: ordered, selfSeatId: widget.selfSeatId, pulse: pulse),
              ),
              for (var i = 0; i < total; i++) _seatOverlay(ordered[i], i, total),
            ],
          );
        },
      ),
    );
  }

  Widget _seatOverlay(PublicPlayerView player, int index, int total) {
    final center = _seatCenter(index, total);
    final isSelf = player.seatId == widget.selfSeatId;
    final r = isSelf ? 27.0 : 24.0;
    final canTap = widget.selectable && player.alive && widget.onSeatTap != null;

    final label = isSelf
        ? "${player.displayName} (you)"
        : !player.alive
            ? "${player.displayName} · out"
            : !player.connected
                ? "${player.displayName} · offline"
                : player.displayName;

    return Positioned(
      left: center.dx - 34,
      top: center.dy - r,
      width: 68,
      child: Column(
        children: [
          SizedBox(
            width: r * 2,
            height: r * 2,
            child: canTap
                ? GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => widget.onSeatTap!(player.seatId),
                    child: const SizedBox.expand(),
                  )
                : null,
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: isSelf ? FontWeight.bold : FontWeight.w600,
              color: isSelf ? const Color(0xFFC9A227) : (player.alive ? Colors.white70 : Colors.white38),
            ),
          ),
        ],
      ),
    );
  }
}

class _MatchTablePainter extends CustomPainter {
  final List<PublicPlayerView> players;
  final String selfSeatId;
  final double pulse;
  _MatchTablePainter({required this.players, required this.selfSeatId, required this.pulse});

  static const _cx = MatchTable._cx;
  static const _cy = MatchTable._cy;
  static const _rx = MatchTable._rx;
  static const _ry = MatchTable._ry;
  static const _gold = Color(0xFFC9A227);
  static const _border = Color(0xFF3A3F52);
  static const _green = Color(0xFF4CAF6D);
  static const _amber = Color(0xFFC9A227);
  static const _red = Color(0xFFD9534F);

  @override
  void paint(Canvas canvas, Size size) {
    _paintTable(canvas);
    _paintCenter(canvas);
    final total = players.length;
    for (var i = 0; i < total; i++) {
      _paintSeat(canvas, players[i], _MatchTableState._seatCenter(i, total));
    }
  }

  void _paintTable(Canvas canvas) {
    final shadowRect = Rect.fromCenter(center: const Offset(_cx, _cy + 8), width: _rx * 2 + 8, height: _ry * 2 + 8);
    canvas.drawOval(shadowRect, Paint()..color = Colors.black.withValues(alpha: 0.35));

    final tableRect = Rect.fromCenter(center: const Offset(_cx, _cy), width: _rx * 2, height: _ry * 2);
    final tableFill = Paint()
      ..shader = ui.Gradient.radial(
        const Offset(_cx, _cy - _ry * 0.2),
        _rx,
        [const Color(0xFF4A3620), const Color(0xFF382A1A), const Color(0xFF1E160D)],
        [0.0, 0.7, 1.0],
      );
    canvas.drawOval(tableRect, tableFill);
    canvas.drawOval(
      tableRect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = const Color(0xFF6B4E2A),
    );

    final innerRect = Rect.fromCenter(center: const Offset(_cx, _cy), width: _rx * 2 * 0.81, height: _ry * 2 * 0.77);
    canvas.drawOval(
      innerRect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = const Color(0xFF5C4527).withValues(alpha: 0.55),
    );
  }

  void _paintCenter(Canvas canvas) {
    final glow = Paint()
      ..shader = ui.Gradient.radial(
        const Offset(_cx, _cy),
        30,
        [_gold.withValues(alpha: 0.4 * pulse), _gold.withValues(alpha: 0)],
      );
    canvas.drawCircle(const Offset(_cx, _cy), 30, glow);
    canvas.drawCircle(const Offset(_cx, _cy), 17, Paint()..color = const Color(0xFF1B1F2E));
    canvas.drawCircle(
      const Offset(_cx, _cy),
      17,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = _border,
    );
    _drawText(canvas, "🚨", const Offset(_cx, _cy), 15, Colors.white);
  }

  void _paintSeat(Canvas canvas, PublicPlayerView player, Offset center) {
    final isSelf = player.seatId == selfSeatId;
    final r = isSelf ? 27.0 : 24.0;

    canvas.drawCircle(center, r, Paint()..color = const Color(0xFF262B3D));
    canvas.drawCircle(
      center,
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = isSelf ? 2 : 1.5
        ..color = isSelf ? _gold : _border,
    );

    final opacity = player.alive ? 1.0 : 0.35;
    _drawText(
      canvas,
      player.displayName.isNotEmpty ? player.displayName[0].toUpperCase() : "?",
      center,
      isSelf ? 15 : 13,
      (isSelf ? _gold : Colors.white).withValues(alpha: opacity),
      bold: true,
    );

    if (player.alive) {
      final dotColor = switch (player.trustIndicator) {
        "green" => _green,
        "red" => _red,
        _ => _amber,
      };
      final dotCenter = Offset(center.dx + r * 0.66, center.dy - r * 0.66);
      canvas.drawCircle(dotCenter, 5, Paint()..color = const Color(0xFF15161F));
      canvas.drawCircle(dotCenter, 4, Paint()..color = dotColor);
    }
  }

  void _drawText(Canvas canvas, String text, Offset center, double fontSize, Color color, {bool bold = false}) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(fontSize: fontSize, color: color, fontWeight: bold ? FontWeight.bold : FontWeight.normal),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    painter.paint(canvas, center - Offset(painter.width / 2, painter.height / 2));
  }

  @override
  bool shouldRepaint(covariant _MatchTablePainter oldDelegate) =>
      oldDelegate.pulse != pulse || oldDelegate.players != players || oldDelegate.selfSeatId != selfSeatId;
}
