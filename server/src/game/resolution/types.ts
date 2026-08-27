import type { LocalizedText } from "../roles/types.js";

/**
 * "all" = safe to broadcast to every viewer (the description itself never
 * names the actor, per section 26/32 — hidden identities stay hidden even
 * in public events). A seatId list restricts an event to those viewers only
 * (e.g. a guardian's protection target, an investigator's private result).
 * This is data for the realtime layer (Phase 8) to enforce — the engine
 * itself never sends anything to a client directly.
 */
export type EventVisibility = "all" | string[];

export type ResolutionEventType =
  | "arrested"
  | "protected"
  | "attack_blocked"
  | "attack_success"
  | "investigate_result"
  | "spy_result"
  | "steal_success"
  | "steal_failed"
  | "trade_success"
  | "bribe_success"
  | "alliance_formed"
  | "royal_order_applied";

export interface ResolutionEvent {
  round: number;
  type: ResolutionEventType;
  actorSeatId: string;
  targetSeatId?: string;
  visibleTo: EventVisibility;
  description: LocalizedText;
}

/** Running totals carried across rounds, mutated in place by the engine.
 * At match end this is the direct source for RoleDefinition.evaluateWin's
 * MatchEndContext (see roles/win-context.ts). */
export interface ResolutionContext {
  kingSeatId: string;
  kingOverthrown: boolean;
  traitorAchievedGoal: boolean;
  successfulProtectionsBySeat: Map<string, number>;
  intelPointsBySeat: Map<string, number>;
  successfulTradesBySeat: Map<string, number>;
}

export function createResolutionContext(kingSeatId: string): ResolutionContext {
  return {
    kingSeatId,
    kingOverthrown: false,
    traitorAchievedGoal: false,
    successfulProtectionsBySeat: new Map(),
    intelPointsBySeat: new Map(),
    successfulTradesBySeat: new Map()
  };
}
