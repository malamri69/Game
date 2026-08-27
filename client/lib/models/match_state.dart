import 'package:flutter/widgets.dart' show Locale;

class LocalizedText {
  final String ar;
  final String en;
  const LocalizedText({required this.ar, required this.en});

  factory LocalizedText.fromJson(Map<String, dynamic> json) =>
      LocalizedText(ar: json['ar'] as String? ?? '', en: json['en'] as String? ?? '');

  /// Picks the right string for the app's current language. Every role,
  /// event, and action label the server sends already carries both (see
  /// server/src/game/roles/types.ts#LocalizedText) — the client just
  /// chooses which one to render, never re-fetches or re-translates.
  String of(Locale locale) => locale.languageCode == 'ar' ? ar : en;
}

class PublicPlayerView {
  final String seatId;
  final String displayName;
  final bool connected;
  final bool alive;
  final int gold;
  final String trustIndicator; // "green" | "yellow" | "red"

  const PublicPlayerView({
    required this.seatId,
    required this.displayName,
    required this.connected,
    required this.alive,
    required this.gold,
    required this.trustIndicator,
  });

  factory PublicPlayerView.fromJson(Map<String, dynamic> json) => PublicPlayerView(
        seatId: json['seatId'] as String,
        displayName: json['displayName'] as String? ?? '',
        connected: json['connected'] as bool? ?? true,
        alive: json['alive'] as bool? ?? true,
        gold: json['gold'] as int? ?? 0,
        trustIndicator: json['trustIndicator'] as String? ?? 'yellow',
      );
}

class PublicEventChoice {
  final String id;
  final LocalizedText label;
  const PublicEventChoice({required this.id, required this.label});

  factory PublicEventChoice.fromJson(Map<String, dynamic> json) => PublicEventChoice(
        id: json['id'] as String,
        label: LocalizedText.fromJson(json['label'] as Map<String, dynamic>),
      );
}

class PublicEvent {
  final String id;
  final LocalizedText name;
  final LocalizedText description;
  final List<PublicEventChoice> choices;

  const PublicEvent({required this.id, required this.name, required this.description, required this.choices});

  factory PublicEvent.fromJson(Map<String, dynamic> json) => PublicEvent(
        id: json['id'] as String,
        name: LocalizedText.fromJson(json['name'] as Map<String, dynamic>),
        description: LocalizedText.fromJson(json['description'] as Map<String, dynamic>),
        choices: (json['choices'] as List<dynamic>? ?? [])
            .map((c) => PublicEventChoice.fromJson(c as Map<String, dynamic>))
            .toList(),
      );
}

class OwnRole {
  final String roleId;
  final LocalizedText name;
  final LocalizedText objective;
  final LocalizedText abilityDescription;

  const OwnRole({required this.roleId, required this.name, required this.objective, required this.abilityDescription});

  factory OwnRole.fromJson(Map<String, dynamic> json) => OwnRole(
        roleId: json['roleId'] as String,
        name: LocalizedText.fromJson(json['name'] as Map<String, dynamic>),
        objective: LocalizedText.fromJson(json['objective'] as Map<String, dynamic>),
        abilityDescription: LocalizedText.fromJson(json['abilityDescription'] as Map<String, dynamic>),
      );
}

class MatchResult {
  final List<String> winnerSeatIds;
  final bool youWon;
  const MatchResult({required this.winnerSeatIds, required this.youWon});

  factory MatchResult.fromJson(Map<String, dynamic> json) => MatchResult(
        winnerSeatIds: (json['winnerSeatIds'] as List<dynamic>? ?? []).map((e) => e as String).toList(),
        youWon: json['youWon'] as bool? ?? false,
      );
}

/// Mirrors server/src/realtime/public-view.ts#MatchStateForViewer exactly —
/// this is the one payload the client ever receives about a match, and
/// it's already redacted server-side (own role only, own-visible events
/// only, reputation collapsed to a trust indicator). The client never
/// re-derives or guesses at hidden state; it only renders what arrives.
class MatchStateForViewer {
  final String code;
  final String state;
  final int round;
  final int totalRounds;
  final int? remainingMs;
  final List<PublicPlayerView> players;
  final OwnRole? ownRole;
  final LocalizedText? ownSecretInfo;
  final PublicEvent? currentEvent;
  final MatchResult? result;

  const MatchStateForViewer({
    required this.code,
    required this.state,
    required this.round,
    required this.totalRounds,
    required this.remainingMs,
    required this.players,
    required this.ownRole,
    required this.ownSecretInfo,
    required this.currentEvent,
    required this.result,
  });

  factory MatchStateForViewer.fromJson(Map<String, dynamic> json) => MatchStateForViewer(
        code: json['code'] as String,
        state: json['state'] as String,
        round: json['round'] as int,
        totalRounds: json['totalRounds'] as int,
        remainingMs: json['remainingMs'] as int?,
        players: (json['players'] as List<dynamic>? ?? [])
            .map((p) => PublicPlayerView.fromJson(p as Map<String, dynamic>))
            .toList(),
        ownRole: json['ownRole'] != null ? OwnRole.fromJson(json['ownRole'] as Map<String, dynamic>) : null,
        ownSecretInfo: json['ownSecretInfo'] != null
            ? LocalizedText.fromJson(json['ownSecretInfo'] as Map<String, dynamic>)
            : null,
        currentEvent:
            json['currentEvent'] != null ? PublicEvent.fromJson(json['currentEvent'] as Map<String, dynamic>) : null,
        result: json['result'] != null ? MatchResult.fromJson(json['result'] as Map<String, dynamic>) : null,
      );
}
