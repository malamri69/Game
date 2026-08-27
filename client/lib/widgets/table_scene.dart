import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

enum _SeatKind { you, filled, empty }

class _Seat {
  final double angleDeg;
  final _SeatKind kind;
  const _Seat(this.angleDeg, this.kind);
}

/// A round table with hooded, faceless figures seated around it — the
/// lobby's "gathering at the table" scene. Purely atmospheric: the current
/// realtime protocol doesn't report live per-seat occupancy, so this isn't
/// wired to a real head-count, just a fixed arrangement of filled/empty
/// seats that sets the mood while the player actually waits.
class TableScene extends StatefulWidget {
  static const double width = 340;
  static const double height = 330;

  const TableScene({super.key});

  @override
  State<TableScene> createState() => _TableSceneState();

  static const List<_Seat> _seats = [
    _Seat(90, _SeatKind.you),
    _Seat(45, _SeatKind.filled),
    _Seat(0, _SeatKind.empty),
    _Seat(-45, _SeatKind.filled),
    _Seat(-90, _SeatKind.empty),
    _Seat(-135, _SeatKind.empty),
    _Seat(180, _SeatKind.filled),
    _Seat(135, _SeatKind.empty),
  ];

  static const double _cx = width / 2;
  static const double _cy = height / 2 - 5;
  static const double _rx = 128;
  static const double _ry = 76;

  static Offset _seatCenter(double angleDeg) {
    final rad = angleDeg * math.pi / 180;
    return Offset(_cx + _rx * math.cos(rad), _cy + _ry * math.sin(rad));
  }
}

class _TableSceneState extends State<TableScene> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 3))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: TableScene.width,
      height: TableScene.height,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final t = _controller.value;
          return CustomPaint(
            size: const Size(TableScene.width, TableScene.height),
            painter: _TablePainter(flicker: 0.86 + 0.14 * math.sin(t * 2 * math.pi * 3)),
            child: Stack(
              children: [
                for (final seat in TableScene._seats)
                  if (seat.kind != _SeatKind.empty) _seatLabel(seat),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _seatLabel(_Seat seat) {
    final center = TableScene._seatCenter(seat.angleDeg);
    const labelWidth = 60.0;
    return Positioned(
      left: center.dx - labelWidth / 2,
      top: center.dy + 24,
      width: labelWidth,
      child: Text(
        seat.kind == _SeatKind.you ? "YOU" : "???",
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 11,
          fontWeight: seat.kind == _SeatKind.you ? FontWeight.bold : FontWeight.normal,
          color: seat.kind == _SeatKind.you ? const Color(0xFFC9A227) : Colors.white54,
        ),
      ),
    );
  }
}

class _TablePainter extends CustomPainter {
  final double flicker;
  _TablePainter({required this.flicker});

  static const _cx = TableScene._cx;
  static const _cy = TableScene._cy;
  static const _rx = TableScene._rx;
  static const _ry = TableScene._ry;
  static const _gold = Color(0xFFC9A227);
  static const _border = Color(0xFF3A3F52);

  @override
  void paint(Canvas canvas, Size size) {
    _paintTable(canvas);
    _paintCandle(canvas);
    for (final seat in TableScene._seats) {
      _paintSeat(canvas, seat);
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

  void _paintCandle(Canvas canvas) {
    final glow = Paint()
      ..shader = ui.Gradient.radial(
        const Offset(_cx, _cy),
        44,
        [_gold.withValues(alpha: 0.85 * flicker), _gold.withValues(alpha: 0)],
      );
    canvas.drawCircle(const Offset(_cx, _cy), 44, glow);

    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: const Offset(_cx, _cy - 6), width: 6, height: 16), const Radius.circular(2)),
      Paint()..color = const Color(0xFFE0D8C8),
    );
    canvas.drawCircle(const Offset(_cx, _cy - 14), 4.5, Paint()..color = Color.lerp(_gold, Colors.white, 0.3 * flicker)!);
  }

  void _paintSeat(Canvas canvas, _Seat seat) {
    final center = TableScene._seatCenter(seat.angleDeg);
    final isYou = seat.kind == _SeatKind.you;
    final isEmpty = seat.kind == _SeatKind.empty;
    final r = isYou ? 27.0 : 24.0;

    if (isEmpty) {
      _drawDashedCircle(canvas, center, r, _border);
      return;
    }

    canvas.drawCircle(
      center,
      r,
      Paint()..color = const Color(0xFF1B1F2E),
    );
    canvas.drawCircle(
      center,
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = isYou ? 2 : 1.5
        ..color = isYou ? _gold : _border,
    );
    _drawHoodedFigure(canvas, center, isYou ? 19 : 17, isYou);
  }

  void _drawHoodedFigure(Canvas canvas, Offset center, double scale, bool isYou) {
    final path = Path();
    // Same silhouette as the design mockup's SVG hoodedFigure symbol,
    // traced in a -20..20 local box and scaled/translated into place.
    path.moveTo(0, -15);
    path.cubicTo(6.5, -15, 10, -10.5, 10, -5.5);
    path.cubicTo(10, -2.5, 8.8, 0.5, 6.5, 2.5);
    path.cubicTo(12, 4.5, 17, 10, 17, 17);
    path.lineTo(-17, 17);
    path.cubicTo(-17, 10, -12, 4.5, -6.5, 2.5);
    path.cubicTo(-8.8, 0.5, -10, -2.5, -10, -5.5);
    path.cubicTo(-10, -10.5, -6.5, -15, 0, -15);
    path.close();

    final matrix = Matrix4.identity()
      ..translateByDouble(center.dx, center.dy, 0, 1)
      ..scaleByDouble(scale / 20, scale / 20, scale / 20, 1);
    final figurePath = path.transform(matrix.storage);

    final fill = Paint()
      ..shader = ui.Gradient.radial(
        Offset(center.dx - scale * 0.1, center.dy - scale * 0.35),
        scale * 1.4,
        isYou ? [const Color(0xFF8A6B2E), const Color(0xFF4A3A18)] : [const Color(0xFF3A3F52), const Color(0xFF14161F)],
      );
    canvas.drawPath(figurePath, fill);

    final eyeDx = scale * 0.16;
    final eyeDy = -scale * 0.25;
    final eyePaint = Paint()..color = _gold.withValues(alpha: 0.75);
    canvas.drawCircle(Offset(center.dx - eyeDx, center.dy + eyeDy), scale * 0.045, eyePaint);
    canvas.drawCircle(Offset(center.dx + eyeDx, center.dy + eyeDy), scale * 0.045, eyePaint);
  }

  void _drawDashedCircle(Canvas canvas, Offset center, double r, Color color) {
    const dashCount = 16;
    const dashFraction = 0.55;
    const sweep = (2 * math.pi / dashCount) * dashFraction;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..color = color.withValues(alpha: 0.7 * flicker.clamp(0.5, 1.0));
    for (var i = 0; i < dashCount; i++) {
      final start = (i / dashCount) * 2 * math.pi;
      canvas.drawArc(Rect.fromCircle(center: center, radius: r), start, sweep, false, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _TablePainter oldDelegate) => oldDelegate.flicker != flicker;
}
