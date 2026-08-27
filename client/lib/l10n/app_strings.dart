/// Fixed UI copy for the client (buttons, labels, phase names). English
/// only, by design choice — the game targets an English-speaking client
/// experience. Game CONTENT (role names, event text, objectives) still
/// arrives from the server bilingual via LocalizedText, but the client
/// only ever reads LocalizedText.en (see models/match_state.dart).
class AppStrings {
  const AppStrings();

  // Login
  String get appName => 'The Unknown King';
  String get enterYourName => 'Your name';
  String get nameRequired => 'Enter your name first';
  String get enter => 'Enter';
  String get connectionFailed => 'Could not connect to the server';

  // Home
  String get playNow => '👑 Play Now';
  String get privateRoom => '👥 Private Room';
  String get leaderboard => '🏆 Leaderboard';
  String get profile => '👤 Profile';
  String get createRoom => 'Create Room';
  String get roomCodeHint => 'Room code (e.g. K7P9)';
  String get join => 'Join';
  String comingSoon(String label) => '$label — coming soon';

  // Lobby
  String get waitingForPlayers => 'Waiting for players…';
  String get botBackfillNote => "If we're short on players, AI fills the rest 🤖";
  String get roomCode => 'Room code';
  String get codeCopied => 'Code copied';

  // Match
  String get kingdomAwakens => '👑 The kingdom awakens…';
  String get yourRolePrefix => 'Your role: ';
  String get secretIntel => 'Secret intel 🤫';
  String round(int r, int total) => 'Round $r/$total';
  String get pickATarget => 'Pick a target:';
  String get typeAMessage => 'Type a message…';

  static const _phaseLabels = {
    'ROLE_REVEAL': '👑 Your Role',
    'EVENT': '🚨 Event',
    'DISCUSSION': '💬 Discussion',
    'VOTING': '🗳️ Voting',
    'SECRET_ACTIONS': '⚔️ Secret Actions',
    'RESOLUTION': '⏳ Resolving',
    'CONSEQUENCES': '📜 Consequences',
    'FINAL_EVENT': '🚨 Final Event',
    'FINAL_DECISION': '🗳️ Final Decision',
  };
  String phaseLabel(String phase) => _phaseLabels[phase] ?? phase;

  // Role-ability action button labels — mirrors server/src/game/roles/catalog.ts
  static const roleAbilityLabels = {
    'royal_order': '👑 Royal Order',
    'attack': '🗡️ Assassinate',
    'investigate': '🕵️ Investigate',
    'protect': '🛡️ Protect',
    'trade': '⚔️ Trade',
    'spy': '🥷 Spy',
    'sabotage': '⚔️ Arrest',
  };

  static const openActionLabels = {'bribe': '💰 Bribe', 'steal': '🫳 Steal', 'form_alliance': '🤝 Alliance'};

  // Player card
  String get disconnected => 'Disconnected';
  String get eliminated => 'Out';

  // Result
  String get youWon => 'You won! 🎉';
  String get matchOver => 'Match over';
  String get yourRoleWasPrefix => 'Your role was: ';
  String get readyForRevenge => 'Ready for revenge? 😈';
  String get rematch => '🔄 Rematch';
  String get home => 'Home';
}
