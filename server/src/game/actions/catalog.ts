import type { ActionDefinition } from "./types.js";

/**
 * Section 15's action list. Role-ability actions are gated to their owning
 * role (matches RoleDefinition.abilityActionId in ../roles/catalog.ts);
 * the social actions (bribe, steal, form_alliance) are open to everyone —
 * alliances and betrayal (sections 22-24) aren't a role's privilege, they're
 * the core social layer every player plays with.
 */
export const ACTION_CATALOG: Record<string, ActionDefinition> = {
  investigate: {
    id: "investigate",
    name: { ar: "تحقيق", en: "Investigate" },
    description: { ar: "احصل على معلومة جزئية عن انتماء لاعب.", en: "Get a partial read on a player's allegiance." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: "investigator"
  },
  protect: {
    id: "protect",
    name: { ar: "حماية", en: "Protect" },
    description: { ar: "احمِ لاعبًا من التهديدات هذه الجولة.", en: "Shield a player from harm this round." },
    requiresTarget: true,
    allowsSelfTarget: true,
    restrictedToRoleId: "guardian"
  },
  attack: {
    id: "attack",
    name: { ar: "اغتيال", en: "Attack" },
    description: { ar: "حاول اغتيال لاعب هذه الجولة.", en: "Attempt to assassinate a player this round." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: "traitor"
  },
  trade: {
    id: "trade",
    name: { ar: "صفقة", en: "Trade" },
    description: { ar: "اعقد صفقة ذهب مع لاعب آخر.", en: "Strike a gold deal with another player." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: "merchant"
  },
  spy: {
    id: "spy",
    name: { ar: "تجسس", en: "Spy" },
    description: { ar: "راقب نشاط لاعب هذه الجولة.", en: "Watch a player's activity this round." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: "spy"
  },
  sabotage: {
    id: "sabotage",
    name: { ar: "اعتقال", en: "Arrest" },
    description: { ar: "اعتقل لاعبًا بدل مهاجمته، يعطل قدرته هذه الجولة.", en: "Arrest a player instead of attacking them, disabling their action this round." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: "commander"
  },
  royal_order: {
    id: "royal_order",
    name: { ar: "أمر ملكي", en: "Royal Order" },
    description: { ar: "أصدر أمرًا يؤثر في نتيجة الجولة.", en: "Issue an order that shifts this round's outcome." },
    requiresTarget: true,
    allowsSelfTarget: true,
    restrictedToRoleId: "king"
  },
  bribe: {
    id: "bribe",
    name: { ar: "رشوة", en: "Bribe" },
    description: { ar: "قدّم ذهبًا مقابل ولاء أو صمت لاعب.", en: "Offer gold in exchange for a player's loyalty or silence." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: null
  },
  steal: {
    id: "steal",
    name: { ar: "سرقة", en: "Steal" },
    description: { ar: "حاول سرقة ذهب من لاعب آخر — خطر مكتشف.", en: "Attempt to steal gold from another player — risk of being caught." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: null
  },
  form_alliance: {
    id: "form_alliance",
    name: { ar: "تحالف", en: "Form Alliance" },
    description: { ar: "اعرض تحالفًا غير ملزم مع لاعب آخر.", en: "Propose a non-binding alliance with another player." },
    requiresTarget: true,
    allowsSelfTarget: false,
    restrictedToRoleId: null
  }
};

export function getAction(actionId: string): ActionDefinition {
  const action = ACTION_CATALOG[actionId];
  if (!action) throw new Error(`Unknown action id: ${actionId}`);
  return action;
}
