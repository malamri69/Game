export type Faction = "crown" | "traitor" | "neutral";

export interface LocalizedText {
  ar: string;
  en: string;
}

/** Minimal, well-typed summary of "how the match ended" that win conditions
 * are evaluated against. The resolution engine (Phase 6) is responsible for
 * populating this from actual match events; role logic never reaches into
 * match internals directly. */
export interface MatchEndContext {
  kingSeatId: string;
  kingOverthrown: boolean;
  aliveSeatIds: ReadonlySet<string>;
  /** seatId -> gold at match end */
  goldBySeat: ReadonlyMap<string, number>;
  /** seatId -> count of successful merchant trades */
  successfulTradesBySeat: ReadonlyMap<string, number>;
  /** true once the resolution engine has confirmed the traitor achieved a
   * coup/assassination/chaos win per section 6 */
  traitorAchievedGoal: boolean;
  /** seatId of every player the investigator correctly identified as
   * non-crown-aligned before match end */
  investigatorCorrectAccusationsBySeat: ReadonlyMap<string, number>;
  /** seatId -> number of times that guardian's protection actually blocked
   * a hostile action */
  successfulProtectionsBySeat: ReadonlyMap<string, number>;
}

export interface RoleDefinition {
  id: string;
  name: LocalizedText;
  faction: Faction;
  /** Short, punchy per section 65/59 — must read in seconds. */
  objective: LocalizedText;
  abilityDescription: LocalizedText;
  /** id of the secret action this role can trigger during SECRET_ACTIONS (Phase 5) */
  abilityActionId: string | null;
  evaluateWin: (ctx: MatchEndContext, seatId: string) => boolean;
}
