import 'package:flutter/material.dart';

/// Fixed UI copy in both languages, written naturally per section 59 (not
/// machine-translated) — not run through a translation service. Game
/// CONTENT (role names, event text, objectives) already arrives from the
/// server bilingual via LocalizedText.of(locale); this class covers only
/// the client's own static labels, buttons, and messages.
class AppStrings {
  final bool ar;
  AppStrings(Locale locale) : ar = locale.languageCode == 'ar';

  String pick(String arText, String enText) => ar ? arText : enText;

  // Login
  String get appNameArabic => 'الملك المجهول';
  String get appNameEnglish => 'The Unknown King';
  String get enterYourName => pick('اسمك', 'Your name');
  String get nameRequired => pick('اكتب اسمك أولاً', 'Enter your name first');
  String get enter => pick('دخول', 'Enter');
  String get connectionFailed => pick('تعذّر الاتصال بالخادم', 'Could not connect to the server');
  String get tagline =>
      pick('مملكة واحدة، لاعبون مجهولون، وملك بينكم لا أحد يعرف هويته…', 'One kingdom, hidden players, and a King among you nobody knows…');

  // Home
  String get playNow => pick('👑 العب الآن', '👑 Play Now');
  String get privateRoom => pick('👥 غرفة خاصة', '👥 Private Room');
  String get leaderboard => pick('🏆 التصنيف', '🏆 Leaderboard');
  String get profile => pick('👤 الملف الشخصي', '👤 Profile');
  String get createRoom => pick('أنشئ غرفة', 'Create Room');
  String get roomCodeHint => pick('كود الغرفة (مثال: K7P9)', 'Room code (e.g. K7P9)');
  String get join => pick('انضم', 'Join');
  String comingSoon(String label) => pick('$label — قريبًا', '$label — coming soon');

  // Lobby
  String get waitingForPlayers => pick('بانتظار اللاعبين…', 'Waiting for players…');
  String get botBackfillNote =>
      pick('لو ما اكتمل العدد، الذكاء الاصطناعي بيكمّل المكان 🤖', "If we're short on players, AI fills the rest 🤖");
  String get roomCode => pick('كود الغرفة', 'Room code');
  String get codeCopied => pick('تم نسخ الكود', 'Code copied');

  // Match
  String get kingdomAwakens => pick('👑 المملكة تستيقظ…', '👑 The kingdom awakens…');
  String get yourRolePrefix => pick('دورك: ', 'Your role: ');
  String get secretIntel => pick('معلومة سرية 🤫', 'Secret intel 🤫');
  String round(int r, int total) => pick('جولة $r/$total', 'Round $r/$total');
  String get pickATarget => pick('اختر لاعبًا:', 'Pick a target:');
  String get typeAMessage => pick('اكتب رسالة…', 'Type a message…');

  static const _phaseLabelsAr = {
    'ROLE_REVEAL': '👑 دورك',
    'EVENT': '🚨 حدث',
    'DISCUSSION': '💬 نقاش',
    'VOTING': '🗳️ تصويت',
    'SECRET_ACTIONS': '⚔️ أفعال سرية',
    'RESOLUTION': '⏳ جارٍ الحساب',
    'CONSEQUENCES': '📜 النتائج',
    'FINAL_EVENT': '🚨 الحدث الأخير',
    'FINAL_DECISION': '🗳️ القرار الأخير',
  };
  static const _phaseLabelsEn = {
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
  String phaseLabel(String phase) => (ar ? _phaseLabelsAr : _phaseLabelsEn)[phase] ?? phase;

  // Role-ability action button labels — mirrors server/src/game/roles/catalog.ts
  static const _roleAbilityAr = {
    'royal_order': '👑 أمر ملكي',
    'attack': '🗡️ اغتيال',
    'investigate': '🕵️ تحقيق',
    'protect': '🛡️ حماية',
    'trade': '⚔️ صفقة',
    'spy': '🥷 تجسس',
    'sabotage': '⚔️ اعتقال',
  };
  static const _roleAbilityEn = {
    'royal_order': '👑 Royal Order',
    'attack': '🗡️ Assassinate',
    'investigate': '🕵️ Investigate',
    'protect': '🛡️ Protect',
    'trade': '⚔️ Trade',
    'spy': '🥷 Spy',
    'sabotage': '⚔️ Arrest',
  };
  Map<String, String> get roleAbilityLabels => ar ? _roleAbilityAr : _roleAbilityEn;

  static const _openActionsAr = {'bribe': '💰 رشوة', 'steal': '🫳 سرقة', 'form_alliance': '🤝 تحالف'};
  static const _openActionsEn = {'bribe': '💰 Bribe', 'steal': '🫳 Steal', 'form_alliance': '🤝 Alliance'};
  Map<String, String> get openActionLabels => ar ? _openActionsAr : _openActionsEn;

  // Player card
  String get disconnected => pick('انقطع', 'Disconnected');
  String get eliminated => pick('خرج', 'Out');

  // Result
  String get youWon => pick('فزت! 🎉', 'You won! 🎉');
  String get matchOver => pick('انتهت المباراة', 'Match over');
  String get yourRoleWasPrefix => pick('دورك كان: ', 'Your role was: ');
  String get readyForRevenge => pick('جاهز تنتقم؟ 😈', 'Ready for revenge? 😈');
  String get rematch => pick('🔄 العب مرة ثانية', '🔄 Rematch');
  String get home => pick('الرئيسية', 'Home');
}
