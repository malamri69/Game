import { secureRng as defaultRng, type SecureRng } from "../../security/rng.js";
import type { ActionRequest } from "../actions/types.js";
import { getRole } from "../roles/catalog.js";
import type { Player } from "../types.js";
import type { ResolutionContext, ResolutionEvent } from "./types.js";

/**
 * Fixed priority order actions resolve in (section 16/17). Earlier steps
 * can change what later steps see — e.g. an arrest nullifies its target's
 * queued action before that action's own step runs, and protection is
 * established before attacks are checked against it.
 */
const PRIORITY_ORDER: ActionRequest["actionId"][] = [
  "sabotage",
  "protect",
  "attack",
  "investigate",
  "spy",
  "steal",
  "trade",
  "bribe",
  "form_alliance",
  "royal_order"
];

const STEAL_SUCCESS_CHANCE = 0.5;
const STEAL_AMOUNT = 30;
const TRADE_SUCCESS_CHANCE = 0.7;
const TRADE_GOLD_MIN = 30;
const TRADE_GOLD_MAX = 70;
const BRIBE_DEFAULT_GOLD = 20;
const ROYAL_ORDER_REPUTATION_BOOST = 2;

function bump(map: Map<string, number>, seatId: string, by = 1): void {
  map.set(seatId, (map.get(seatId) ?? 0) + by);
}

/**
 * Turns one round's queued actions into concrete effects on player state,
 * plus a list of events describing what happened and who's allowed to see
 * it. Never called from anywhere but the server — this is the one place
 * "what actually happened" gets decided (section 17: Validate -> Queue ->
 * Priority -> Resolve -> Apply Effects -> Generate Events).
 */
export class ResolutionEngine {
  constructor(private readonly rng: SecureRng = defaultRng) {}

  resolve(
    round: number,
    actions: readonly ActionRequest[],
    playersBySeat: ReadonlyMap<string, Player>,
    ctx: ResolutionContext
  ): ResolutionEvent[] {
    const events: ResolutionEvent[] = [];
    const arrested = new Set<string>();
    const protectorBySeat = new Map<string, string>();

    for (const step of PRIORITY_ORDER) {
      for (const action of actions) {
        if (action.actionId !== step) continue;
        if (arrested.has(action.seatId)) continue;

        const actor = playersBySeat.get(action.seatId);
        if (!actor || !actor.alive) continue;
        const target = action.targetSeatId ? playersBySeat.get(action.targetSeatId) : undefined;

        switch (step) {
          case "sabotage":
            if (!target) break;
            arrested.add(target.seatId);
            events.push({
              round,
              type: "arrested",
              actorSeatId: actor.seatId,
              targetSeatId: target.seatId,
              visibleTo: [actor.seatId, target.seatId],
              actorVisible: false,
              description: { ar: "تم اعتقال لاعب — قدرته معطّلة هذه الجولة.", en: "A player was arrested — their ability is disabled this round." }
            });
            break;

          case "protect":
            if (!target) break;
            protectorBySeat.set(target.seatId, actor.seatId);
            events.push({
              round,
              type: "protected",
              actorSeatId: actor.seatId,
              targetSeatId: target.seatId,
              visibleTo: [actor.seatId, target.seatId],
              actorVisible: false,
              description: { ar: "تم تحصين لاعب هذه الجولة.", en: "A player was shielded this round." }
            });
            break;

          case "attack": {
            if (!target) break;
            const guardianSeatId = protectorBySeat.get(target.seatId);
            if (guardianSeatId) {
              bump(ctx.successfulProtectionsBySeat, guardianSeatId);
              events.push({
                round,
                type: "attack_blocked",
                actorSeatId: actor.seatId,
                targetSeatId: target.seatId,
                visibleTo: "all",
                actorVisible: false,
                description: { ar: "🛡️ محاولة اغتيال فشلت الليلة الماضية.", en: "🛡️ An assassination attempt failed last night." }
              });
            } else {
              target.alive = false;
              if (target.seatId === ctx.kingSeatId) {
                ctx.kingOverthrown = true;
                ctx.traitorAchievedGoal = true;
              }
              events.push({
                round,
                type: "attack_success",
                actorSeatId: actor.seatId,
                targetSeatId: target.seatId,
                visibleTo: "all",
                actorVisible: false,
                description: { ar: "🗡️ اغتيال هزّ المملكة الليلة الماضية.", en: "🗡️ An assassination has shaken the kingdom." }
              });
            }
            break;
          }

          case "investigate": {
            if (!target || !target.roleId) break;
            const role = getRole(target.roleId);
            const isNonCrown = role.faction !== "crown";
            if (isNonCrown) bump(ctx.intelPointsBySeat, actor.seatId);
            events.push({
              round,
              type: "investigate_result",
              actorSeatId: actor.seatId,
              targetSeatId: target.seatId,
              visibleTo: [actor.seatId],
              description: isNonCrown
                ? { ar: "هذا اللاعب ينتمي إلى جهة معادية للمملكة.", en: "This player belongs to a faction hostile to the crown." }
                : { ar: "لا شيء يدين هذا اللاعب.", en: "Nothing incriminating turned up on this player." }
            });
            break;
          }

          case "spy": {
            if (!target) break;
            bump(ctx.intelPointsBySeat, actor.seatId);
            const targetAction = actions.find((a) => a.seatId === target.seatId);
            events.push({
              round,
              type: "spy_result",
              actorSeatId: actor.seatId,
              targetSeatId: target.seatId,
              visibleTo: [actor.seatId],
              description: targetAction
                ? { ar: "رصدت نشاطًا مريبًا لهذا اللاعب هذه الجولة.", en: "You caught this player's activity this round." }
                : { ar: "هذا اللاعب لم يفعل شيئًا لافتًا هذه الجولة.", en: "This player did nothing notable this round." }
            });
            break;
          }

          case "steal": {
            if (!target) break;
            const succeeded = this.rng.int(0, 100) < STEAL_SUCCESS_CHANCE * 100;
            if (succeeded) {
              const amount = Math.min(STEAL_AMOUNT, target.resources.gold);
              target.resources.gold -= amount;
              actor.resources.gold += amount;
              events.push({
                round,
                type: "steal_success",
                actorSeatId: actor.seatId,
                targetSeatId: target.seatId,
                // A clean theft stays silent — only the thief knows. The
                // victim finds out from their own gold total, not an event
                // that would out the thief for free.
                visibleTo: [actor.seatId],
                description: { ar: "💰 سرقت ذهبًا ولم يلاحظ أحد.", en: "💰 You stole gold and nobody noticed." }
              });
            } else {
              actor.resources.reputation -= 1;
              events.push({
                round,
                type: "steal_failed",
                actorSeatId: actor.seatId,
                targetSeatId: target.seatId,
                // Getting caught is the dramatic, social-deduction-relevant
                // outcome, so unlike a clean theft, the victim learns
                // exactly who tried.
                visibleTo: [actor.seatId, target.seatId],
                description: { ar: "🤦 حاول أحدهم سرقتك ولكن انكشف أمره!", en: "🤦 Someone tried to steal from you and got caught!" }
              });
            }
            break;
          }

          case "trade": {
            if (!target) break;
            // Not every deal closes — see balance simulator notes in
            // docs/TECHNICAL_PLAN.md: an unconditional trade made the
            // Merchant's win condition trivially easy to reach.
            if (this.rng.int(0, 100) < TRADE_SUCCESS_CHANCE * 100) {
              const gained = this.rng.int(TRADE_GOLD_MIN, TRADE_GOLD_MAX + 1);
              actor.resources.gold += gained;
              bump(ctx.successfulTradesBySeat, actor.seatId);
              events.push({
                round,
                type: "trade_success",
                actorSeatId: actor.seatId,
                targetSeatId: target.seatId,
                visibleTo: [actor.seatId, target.seatId],
                description: { ar: "⚔️ تمت صفقة تجارية بنجاح!", en: "⚔️ A trade deal went through!" }
              });
            }
            break;
          }

          case "bribe": {
            if (!target) break;
            const amount = Math.min(action.goldOffer ?? BRIBE_DEFAULT_GOLD, actor.resources.gold);
            actor.resources.gold -= amount;
            target.resources.gold += amount;
            actor.resources.reputation -= 1;
            events.push({
              round,
              type: "bribe_success",
              actorSeatId: actor.seatId,
              targetSeatId: target.seatId,
              visibleTo: [actor.seatId, target.seatId],
              description: { ar: "🤝 عُقدت رشوة بين لاعبين.", en: "🤝 A bribe changed hands between players." }
            });
            break;
          }

          case "form_alliance": {
            if (!target) break;
            actor.resources.reputation += 1;
            target.resources.reputation += 1;
            events.push({
              round,
              type: "alliance_formed",
              actorSeatId: actor.seatId,
              targetSeatId: target.seatId,
              visibleTo: [actor.seatId, target.seatId],
              description: { ar: "تحالف جديد تشكّل — لكنه غير ملزم.", en: "A new alliance formed — but it's not binding." }
            });
            break;
          }

          case "royal_order": {
            const orderTarget = target ?? actor;
            orderTarget.resources.reputation += ROYAL_ORDER_REPUTATION_BOOST;
            events.push({
              round,
              type: "royal_order_applied",
              actorSeatId: actor.seatId,
              targetSeatId: orderTarget.seatId,
              visibleTo: "all",
              actorVisible: false,
              description: { ar: "👑 صدر أمر ملكي جديد.", en: "👑 A new royal order has been issued." }
            });
            break;
          }
        }
      }
    }

    return events;
  }
}
