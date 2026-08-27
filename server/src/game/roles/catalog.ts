import type { RoleDefinition } from "./types.js";

/**
 * The 8 MVP roles (section 6). Deliberately not "find the traitor" — each
 * role has its own win condition (section 77), so a match produces a
 * different story depending on who quietly achieved what.
 */
export const ROLE_CATALOG: Record<string, RoleDefinition> = {
  king: {
    id: "king",
    name: { ar: "الملك", en: "The King" },
    faction: "crown",
    objective: { ar: "ابقَ في الحكم حتى نهاية المباراة.", en: "Stay in power until the match ends." },
    abilityDescription: {
      ar: "أصدر أمرًا ملكيًا مرة كل جولة، ولديك دفاع محدود ضد التهديدات.",
      en: "Issue one royal order per round, and a limited defense against threats."
    },
    abilityActionId: "royal_order",
    evaluateWin: (ctx, seatId) => seatId === ctx.kingSeatId && !ctx.kingOverthrown
  },
  traitor: {
    id: "traitor",
    name: { ar: "الخائن", en: "The Traitor" },
    faction: "traitor",
    objective: { ar: "أسقط الملك — بالاغتيال أو الانقلاب أو الفوضى.", en: "Bring down the King — by assassination, coup, or chaos." },
    abilityDescription: { ar: "يمكنك محاولة اغتيال لاعب كل جولة.", en: "You may attempt to assassinate a player each round." },
    abilityActionId: "attack",
    evaluateWin: (ctx) => ctx.traitorAchievedGoal
  },
  investigator: {
    id: "investigator",
    name: { ar: "المحقق", en: "The Investigator" },
    faction: "crown",
    objective: { ar: "اكتشف الخائن وساعد الملك على البقاء.", en: "Uncover the traitor and help the King survive." },
    abilityDescription: {
      ar: "تحقق في لاعب كل جولة للحصول على معلومة جزئية عن انتمائه.",
      en: "Investigate one player per round for a partial read on their allegiance."
    },
    abilityActionId: "investigate",
    evaluateWin: (ctx, seatId) => {
      const correct = ctx.intelPointsBySeat.get(seatId) ?? 0;
      return correct > 0 && !ctx.kingOverthrown;
    }
  },
  guardian: {
    id: "guardian",
    name: { ar: "الحارس", en: "The Guardian" },
    faction: "crown",
    objective: { ar: "احمِ الشخصيات المهمة من الخطر.", en: "Protect the kingdom's key figures from harm." },
    abilityDescription: {
      ar: "احمِ لاعبًا واحدًا كل جولة، لا يمكنك حماية نفس اللاعب مرتين متتاليتين.",
      en: "Protect one player each round; you can't protect the same player twice in a row."
    },
    abilityActionId: "protect",
    evaluateWin: (ctx, seatId) => (ctx.successfulProtectionsBySeat.get(seatId) ?? 0) > 0 && !ctx.kingOverthrown
  },
  merchant: {
    id: "merchant",
    name: { ar: "التاجر", en: "The Merchant" },
    faction: "neutral",
    objective: { ar: "اجمع 500 ذهب أو نفّذ صفقتين ناجحتين.", en: "Amass 500 Gold or complete two successful trades." },
    abilityDescription: { ar: "اعقد صفقة مع لاعب آخر كل جولة.", en: "Strike a deal with another player each round." },
    abilityActionId: "trade",
    evaluateWin: (ctx, seatId) =>
      (ctx.goldBySeat.get(seatId) ?? 0) >= 500 || (ctx.successfulTradesBySeat.get(seatId) ?? 0) >= 2
  },
  spy: {
    id: "spy",
    name: { ar: "الجاسوس", en: "The Spy" },
    faction: "neutral",
    objective: { ar: "اجمع معلومات سرية عن ثلاثة لاعبين على الأقل.", en: "Gather secret intel on at least three players." },
    abilityDescription: { ar: "راقب لاعبًا واحدًا كل جولة لكشف نشاطه.", en: "Watch one player each round to reveal their activity." },
    abilityActionId: "spy",
    evaluateWin: (ctx, seatId) => (ctx.intelPointsBySeat.get(seatId) ?? 0) >= 3
  },
  commander: {
    id: "commander",
    name: { ar: "قائد الحرس", en: "The Commander" },
    faction: "crown",
    objective: { ar: "احمِ المملكة من التهديدات العسكرية.", en: "Protect the kingdom from military threats." },
    abilityDescription: { ar: "يمكنك اعتقال لاعب بدل مهاجمته في ظروف معينة.", en: "You may arrest a player instead of attacking, under the right conditions." },
    abilityActionId: "sabotage",
    evaluateWin: (ctx) => !ctx.kingOverthrown
  },
  citizen: {
    id: "citizen",
    name: { ar: "المواطن", en: "The Citizen" },
    faction: "crown",
    objective: { ar: "حافظ على استقرار المملكة وصوّت بحكمة.", en: "Keep the kingdom stable and vote wisely." },
    abilityDescription: { ar: "لا قدرة خاصة، لكن صوتك ونقاشك يؤثران في مصير المملكة.", en: "No special power, but your vote and voice shape the kingdom's fate." },
    abilityActionId: null,
    evaluateWin: (ctx) => !ctx.kingOverthrown
  }
};

export function getRole(roleId: string): RoleDefinition {
  const role = ROLE_CATALOG[roleId];
  if (!role) throw new Error(`Unknown role id: ${roleId}`);
  return role;
}
