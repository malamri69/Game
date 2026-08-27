import type { ResolutionContext } from "../resolution/types.js";
import type { Player } from "../types.js";
import type { MatchEndContext } from "./types.js";

/** Builds the read-only MatchEndContext every role's evaluateWin runs
 * against, from the live ResolutionContext plus final player state. */
export function buildMatchEndContext(players: readonly Player[], ctx: ResolutionContext): MatchEndContext {
  const goldBySeat = new Map(players.map((p) => [p.seatId, p.resources.gold]));
  const aliveSeatIds = new Set(players.filter((p) => p.alive).map((p) => p.seatId));
  return {
    kingSeatId: ctx.kingSeatId,
    kingOverthrown: ctx.kingOverthrown,
    aliveSeatIds,
    goldBySeat,
    successfulTradesBySeat: ctx.successfulTradesBySeat,
    traitorAchievedGoal: ctx.traitorAchievedGoal,
    intelPointsBySeat: ctx.intelPointsBySeat,
    successfulProtectionsBySeat: ctx.successfulProtectionsBySeat
  };
}
