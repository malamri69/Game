import type { EventDefinition } from "./types.js";

/**
 * 20 MVP events (section 19). Every event forces a real decision — never a
 * flavor-only prompt — and every choice's copy stays short per section 65.
 * Arabic copy follows section 59: punchy, not machine-translated formalese.
 */
export const EVENT_CATALOG: EventDefinition[] = [
  {
    id: "palace_conspiracy",
    name: { ar: "مؤامرة داخل القصر", en: "Conspiracy in the Palace" },
    description: { ar: "🚨 فيه نشاط مشبوه داخل المملكة!", en: "🚨 Suspicious activity inside the kingdom!" },
    choices: [
      { id: "search_palace", label: { ar: "فتّشوا القصر", en: "Search the palace" }, effects: [{ scope: "kingdom", reputationDelta: 2, description: { ar: "القصر تحت المراقبة الآن.", en: "The palace is under watch now." } }] },
      { id: "raise_taxes", label: { ar: "ارفعوا الضرائب", en: "Raise taxes" }, effects: [{ scope: "kingdom", goldDelta: 50, reputationDelta: -1, description: { ar: "الخزينة زادت، لكن الناس غاضبين.", en: "The treasury grew, but the people are angry." } }] },
      { id: "send_army", label: { ar: "أرسلوا الجيش", en: "Send the army" }, effects: [{ scope: "kingdom", goldDelta: -20, description: { ar: "الجيش تحرك — الوضع تحت السيطرة مؤقتًا.", en: "The army moved out — things are under control, for now." } }] }
    ]
  },
  {
    id: "coup_attempt",
    name: { ar: "انقلاب", en: "Coup Attempt" },
    description: { ar: "⚔️ في محاولة انقلاب داخل البلاط!", en: "⚔️ A coup attempt is unfolding at court!" },
    choices: [
      { id: "back_king", label: { ar: "قفوا مع الملك", en: "Stand with the King" }, effects: [{ scope: "king", reputationDelta: 3, description: { ar: "الحاشية تلتف حول الملك.", en: "The court rallies around the King." } }] },
      { id: "stay_neutral", label: { ar: "خلّوها بينهم", en: "Stay out of it" }, effects: [{ scope: "kingdom", description: { ar: "المملكة تراقب من بعيد.", en: "The kingdom watches from a distance." } }] },
      { id: "back_rebels", label: { ar: "ادعموا المتمردين", en: "Back the rebels" }, effects: [{ scope: "king", reputationDelta: -3, description: { ar: "عرش الملك يهتز.", en: "The King's throne shakes." } }] }
    ]
  },
  {
    id: "uprising",
    name: { ar: "تمرد", en: "Uprising" },
    description: { ar: "🔥 الشعب طفح كيله!", en: "🔥 The people have had enough!" },
    choices: [
      { id: "negotiate", label: { ar: "فاوضوهم", en: "Negotiate" }, effects: [{ scope: "kingdom", goldDelta: -30, reputationDelta: 2, description: { ar: "التفاوض هدّأ الأوضاع.", en: "Negotiation calmed things down." } }] },
      { id: "crush", label: { ar: "اسحقوا التمرد", en: "Crush it" }, effects: [{ scope: "kingdom", reputationDelta: -2, description: { ar: "الهدوء عاد، لكن بثمن.", en: "Order is restored, at a cost." } }] }
    ]
  },
  {
    id: "palace_fire",
    name: { ar: "حريق القصر", en: "Palace Fire" },
    description: { ar: "🔥 القصر يحترق!", en: "🔥 The palace is on fire!" },
    choices: [
      { id: "save_treasury", label: { ar: "أنقذوا الخزينة", en: "Save the treasury" }, effects: [{ scope: "kingdom", goldDelta: 20, description: { ar: "الذهب بأمان.", en: "The gold is safe." } }] },
      { id: "save_archives", label: { ar: "أنقذوا السجلات", en: "Save the archives" }, effects: [{ scope: "kingdom", reputationDelta: 2, description: { ar: "أسرار كثيرة نجت من النار.", en: "Many secrets survived the fire." } }] }
    ]
  },
  {
    id: "missing_gold",
    name: { ar: "اختفاء الذهب", en: "The Missing Gold" },
    description: { ar: "💰 كيس ذهب اختفى من الخزينة!", en: "💰 A bag of gold vanished from the treasury!" },
    choices: [
      { id: "investigate_theft", label: { ar: "حققوا بالسرقة", en: "Investigate the theft" }, effects: [{ scope: "kingdom", goldDelta: -10, reputationDelta: 1, description: { ar: "التحقيق كشف أدلة، لكنه كلّف وقتًا وذهبًا.", en: "The investigation turned up leads, at a cost." } }] },
      { id: "let_it_go", label: { ar: "تجاهلوها", en: "Let it go" }, effects: [{ scope: "kingdom", goldDelta: -30, description: { ar: "الذهب راح، والقصة انتهت.", en: "The gold's gone, and so is the story." } }] }
    ]
  },
  {
    id: "official_assassinated",
    name: { ar: "اغتيال مسؤول", en: "Official Assassinated" },
    description: { ar: "🗡️ أحد مسؤولي القصر اغتيل الليلة الماضية!", en: "🗡️ A palace official was assassinated last night!" },
    choices: [
      { id: "public_mourning", label: { ar: "أعلنوا الحداد", en: "Declare mourning" }, effects: [{ scope: "kingdom", reputationDelta: 2, description: { ar: "المملكة تقف صفًا واحدًا.", en: "The kingdom stands united." } }] },
      { id: "hunt_killer", label: { ar: "ابحثوا عن القاتل", en: "Hunt the killer" }, effects: [{ scope: "kingdom", goldDelta: -15, description: { ar: "التحقيق جارٍ.", en: "The hunt is on." } }] }
    ]
  },
  {
    id: "mysterious_illness",
    name: { ar: "مرض غامض", en: "Mysterious Illness" },
    description: { ar: "🤒 مرض غريب ينتشر بين الحاشية.", en: "🤒 A strange illness is spreading through the court." },
    choices: [
      { id: "quarantine", label: { ar: "اعزلوا المصابين", en: "Quarantine the sick" }, effects: [{ scope: "kingdom", reputationDelta: -1, description: { ar: "العزل أوقف الانتشار.", en: "Quarantine halted the spread." } }] },
      { id: "call_healers", label: { ar: "استدعوا المعالجين", en: "Call the healers" }, effects: [{ scope: "kingdom", goldDelta: -25, reputationDelta: 2, description: { ar: "المعالجون أنقذوا كثيرين.", en: "The healers saved many." } }] }
    ]
  },
  {
    id: "food_theft",
    name: { ar: "سرقة مخزون الطعام", en: "Food Stores Robbed" },
    description: { ar: "🌾 مخزون الطعام تعرض للسرقة!", en: "🌾 The food stores were robbed!" },
    choices: [
      { id: "ration", label: { ar: "وزّعوا الحصص", en: "Ration supplies" }, effects: [{ scope: "kingdom", reputationDelta: -1, description: { ar: "الجميع يتحمل النقص معًا.", en: "Everyone shares the shortage." } }] },
      { id: "buy_more", label: { ar: "اشتروا المزيد", en: "Buy more food" }, effects: [{ scope: "kingdom", goldDelta: -40, description: { ar: "المخازن ممتلئة من جديد.", en: "The stores are full again." } }] }
    ]
  },
  {
    id: "mine_discovered",
    name: { ar: "اكتشاف منجم", en: "A Mine Discovered" },
    description: { ar: "⛏️ منجم ذهب جديد اكتُشف قرب الحدود!", en: "⛏️ A new gold mine was discovered near the border!" },
    choices: [
      { id: "claim_mine", label: { ar: "اطالبوا بالمنجم", en: "Claim the mine" }, effects: [{ scope: "kingdom", goldDelta: 60, description: { ar: "ثروة جديدة للمملكة.", en: "New wealth for the kingdom." } }] },
      { id: "share_mine", label: { ar: "شاركوا الجيران فيه", en: "Share it with neighbors" }, effects: [{ scope: "kingdom", goldDelta: 25, reputationDelta: 2, description: { ar: "علاقات أفضل، ذهب أقل.", en: "Better relations, less gold." } }] }
    ]
  },
  {
    id: "tax_hike",
    name: { ar: "ارتفاع الضرائب", en: "Tax Hike" },
    description: { ar: "📈 مستشارو الملك يطالبون برفع الضرائب.", en: "📈 The King's advisors push for higher taxes." },
    choices: [
      { id: "approve", label: { ar: "وافقوا", en: "Approve it" }, effects: [{ scope: "kingdom", goldDelta: 40, reputationDelta: -2, description: { ar: "الخزينة تمتلئ، الشعب يتذمر.", en: "The treasury fills, the people grumble." } }] },
      { id: "reject", label: { ar: "ارفضوها", en: "Reject it" }, effects: [{ scope: "kingdom", reputationDelta: 1, description: { ar: "الشعب مرتاح، الخزينة كما هي.", en: "The people are relieved, the treasury unchanged." } }] }
    ]
  },
  {
    id: "political_scandal",
    name: { ar: "فضيحة سياسية", en: "Political Scandal" },
    description: { ar: "📰 فضيحة تهز البلاط!", en: "📰 A scandal is rocking the court!" },
    choices: [
      { id: "cover_up", label: { ar: "غطّوا القضية", en: "Cover it up" }, effects: [{ scope: "kingdom", goldDelta: -20, description: { ar: "القضية اختفت، بثمن.", en: "The story disappeared, for a price." } }] },
      { id: "expose", label: { ar: "افضحوها للعلن", en: "Expose it" }, effects: [{ scope: "kingdom", reputationDelta: -2, description: { ar: "الحقيقة خرجت، والثقة اهتزت.", en: "The truth is out, and trust is shaken." } }] }
    ]
  },
  {
    id: "leaked_letter",
    name: { ar: "تسريب رسالة", en: "A Leaked Letter" },
    description: { ar: "✉️ رسالة سرية من القصر تسربت!", en: "✉️ A secret palace letter has leaked!" },
    choices: [
      { id: "deny", label: { ar: "أنكروا كل شيء", en: "Deny everything" }, effects: [{ scope: "kingdom", description: { ar: "الشك ما زال قائمًا.", en: "Suspicion lingers." } }] },
      { id: "find_leaker", label: { ar: "ابحثوا عن المسرّب", en: "Find the leaker" }, effects: [{ scope: "kingdom", goldDelta: -10, reputationDelta: 1, description: { ar: "المسرّب تحت المراقبة الآن.", en: "The leaker is under watch now." } }] }
    ]
  },
  {
    id: "commander_missing",
    name: { ar: "اختفاء قائد الجيش", en: "The Commander Vanishes" },
    description: { ar: "🪖 قائد الجيش اختفى فجأة!", en: "🪖 The army commander has vanished!" },
    choices: [
      { id: "search", label: { ar: "ابحثوا عنه", en: "Search for him" }, effects: [{ scope: "kingdom", goldDelta: -15, description: { ar: "البحث جارٍ في كل مكان.", en: "The search is on everywhere." } }] },
      { id: "appoint_new", label: { ar: "عيّنوا قائدًا جديدًا", en: "Appoint a new commander" }, effects: [{ scope: "kingdom", reputationDelta: -1, description: { ar: "قيادة جديدة، ولاء غير مؤكد.", en: "New leadership, unproven loyalty." } }] }
    ]
  },
  {
    id: "noble_arrested",
    name: { ar: "اعتقال أحد النبلاء", en: "A Noble Arrested" },
    description: { ar: "⛓️ أحد النبلاء اعتُقل بتهمة الخيانة!", en: "⛓️ A noble has been arrested for treason!" },
    choices: [
      { id: "public_trial", label: { ar: "حاكموه علنًا", en: "Hold a public trial" }, effects: [{ scope: "kingdom", reputationDelta: 2, description: { ar: "العدالة ظهرت للجميع.", en: "Justice was seen to be done." } }] },
      { id: "quiet_release", label: { ar: "أطلقوه بهدوء", en: "Release him quietly" }, effects: [{ scope: "kingdom", goldDelta: 15, reputationDelta: -2, description: { ar: "صفقة صامتة خلف الأبواب.", en: "A quiet deal behind closed doors." } }] }
    ]
  },
  {
    id: "public_protest",
    name: { ar: "احتجاج الشعب", en: "Public Protest" },
    description: { ar: "📢 حشود تحتج أمام بوابات القصر!", en: "📢 Crowds are protesting at the palace gates!" },
    choices: [
      { id: "address_crowd", label: { ar: "خاطبوا الحشود", en: "Address the crowd" }, effects: [{ scope: "kingdom", reputationDelta: 2, description: { ar: "الكلمات هدّأت الغضب.", en: "Words calmed the anger." } }] },
      { id: "disperse", label: { ar: "فرّقوهم بالقوة", en: "Disperse them by force" }, effects: [{ scope: "kingdom", reputationDelta: -3, description: { ar: "الهدوء عاد بالقوة، لا بالرضا.", en: "Order returned by force, not consent." } }] }
    ]
  },
  {
    id: "foreign_attack",
    name: { ar: "هجوم خارجي", en: "Foreign Attack" },
    description: { ar: "🛡️ قوة أجنبية تهاجم الحدود!", en: "🛡️ A foreign force is attacking the border!" },
    choices: [
      { id: "defend", label: { ar: "دافعوا عن الحدود", en: "Defend the border" }, effects: [{ scope: "kingdom", goldDelta: -35, reputationDelta: 2, description: { ar: "الحدود صمدت.", en: "The border held." } }] },
      { id: "sue_peace", label: { ar: "اطلبوا الهدنة", en: "Sue for peace" }, effects: [{ scope: "kingdom", goldDelta: -50, description: { ar: "السلام له ثمن باهظ.", en: "Peace came at a steep price." } }] }
    ]
  },
  {
    id: "black_market",
    name: { ar: "سوق سوداء", en: "Black Market" },
    description: { ar: "🕶️ سوق سوداء تنشط داخل المملكة.", en: "🕶️ A black market is thriving in the kingdom." },
    choices: [
      { id: "shut_down", label: { ar: "أغلقوها", en: "Shut it down" }, effects: [{ scope: "kingdom", reputationDelta: 1, description: { ar: "السوق أُغلقت.", en: "The market is closed." } }] },
      { id: "tax_it", label: { ar: "افرضوا عليها ضريبة", en: "Tax it instead" }, effects: [{ scope: "kingdom", goldDelta: 30, reputationDelta: -1, description: { ar: "المملكة تجني من الظل.", en: "The kingdom profits from the shadows." } }] }
    ]
  },
  {
    id: "king_missing",
    name: { ar: "اختفاء الملك", en: "The King Is Missing" },
    description: { ar: "👑 الملك لم يظهر منذ الصباح!", en: "👑 The King hasn't been seen since morning!" },
    choices: [
      { id: "search_grounds", label: { ar: "فتشوا القصر بالكامل", en: "Search the grounds" }, effects: [{ scope: "kingdom", goldDelta: -10, description: { ar: "بحث محموم في كل زاوية.", en: "A frantic search of every corner." } }] },
      { id: "assume_regent", label: { ar: "عيّنوا وصيًا مؤقتًا", en: "Appoint a temporary regent" }, effects: [{ scope: "king", reputationDelta: -2, description: { ar: "سلطة مؤقتة، وشك دائم.", en: "Temporary power, lasting suspicion." } }] }
    ]
  },
  {
    id: "inner_conspiracy",
    name: { ar: "مؤامرة داخلية", en: "Inner Conspiracy" },
    description: { ar: "🗝️ أدلة على مؤامرة من داخل البلاط نفسه.", en: "🗝️ Evidence points to a conspiracy from within the court itself." },
    choices: [
      { id: "interrogate", label: { ar: "استجوبوا الحاشية", en: "Interrogate the court" }, effects: [{ scope: "kingdom", reputationDelta: -1, description: { ar: "الشك ينتشر بين الجميع.", en: "Suspicion spreads among everyone." } }] },
      { id: "watch_silently", label: { ar: "راقبوا بصمت", en: "Watch silently" }, effects: [{ scope: "kingdom", description: { ar: "العيون مفتوحة، الأفواه مغلقة.", en: "Eyes open, mouths shut." } }] }
    ]
  },
  {
    id: "anonymous_message",
    name: { ar: "رسالة مجهولة", en: "An Anonymous Message" },
    description: { ar: "📜 رسالة مجهولة المصدر تصل للمجلس.", en: "📜 An anonymous message reaches the council." },
    choices: [
      { id: "trust_it", label: { ar: "صدّقوها وتصرفوا", en: "Trust it and act" }, effects: [{ scope: "kingdom", reputationDelta: 1, description: { ar: "المجلس تحرك بناءً على الرسالة.", en: "The council acted on the message." } }] },
      { id: "ignore_it", label: { ar: "تجاهلوها", en: "Ignore it" }, effects: [{ scope: "kingdom", description: { ar: "الرسالة طُويت وحُفظت.", en: "The message was filed away." } }] }
    ]
  }
];

export function getEvent(eventId: string): EventDefinition {
  const event = EVENT_CATALOG.find((e) => e.id === eventId);
  if (!event) throw new Error(`Unknown event id: ${eventId}`);
  return event;
}
