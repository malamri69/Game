import type { Player } from "../types.js";
import { getAction } from "./catalog.js";
import type { ActionRequest } from "./types.js";

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Pure validation — no side effects, no state mutation. The realtime layer
 * calls this before ever admitting a request into the round's action
 * queue (section 17: Action -> Validate -> Queue -> ...).
 */
export function validateAction(
  request: ActionRequest,
  actor: Player,
  playersBySeat: ReadonlyMap<string, Player>
): ValidationResult {
  if (!actor.alive) return { ok: false, reason: "actor_dead" };
  if (!actor.connected && !actor.isBot) return { ok: false, reason: "actor_disconnected" };

  let action;
  try {
    action = getAction(request.actionId);
  } catch {
    return { ok: false, reason: "unknown_action" };
  }

  if (action.restrictedToRoleId !== null && actor.roleId !== action.restrictedToRoleId) {
    return { ok: false, reason: "role_not_allowed" };
  }

  if (action.requiresTarget) {
    if (!request.targetSeatId) return { ok: false, reason: "target_required" };
    const target = playersBySeat.get(request.targetSeatId);
    if (!target) return { ok: false, reason: "unknown_target" };
    if (!target.alive) return { ok: false, reason: "target_dead" };
    if (target.seatId === actor.seatId && !action.allowsSelfTarget) {
      return { ok: false, reason: "self_target_not_allowed" };
    }
  } else if (request.targetSeatId) {
    return { ok: false, reason: "target_not_allowed" };
  }

  if (request.goldOffer !== undefined) {
    if (request.goldOffer < 0) return { ok: false, reason: "invalid_gold_offer" };
    if (request.goldOffer > actor.resources.gold) return { ok: false, reason: "insufficient_gold" };
  }

  return { ok: true };
}

/**
 * Holds at most one action per seat for the current round — resubmitting
 * overwrites the previous choice, matching the "pick until the timer ends"
 * UX (section 15). Nothing here decides outcomes; that's the resolution
 * engine's job (Phase 6).
 */
export class ActionQueue {
  private bySeat = new Map<string, ActionRequest>();

  submit(request: ActionRequest): void {
    this.bySeat.set(request.seatId, request);
  }

  all(): ActionRequest[] {
    return [...this.bySeat.values()];
  }

  clear(): void {
    this.bySeat.clear();
  }

  size(): number {
    return this.bySeat.size;
  }
}
