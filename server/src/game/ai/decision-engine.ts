import { secureRng as defaultRng, type SecureRng } from "../../security/rng.js";
import { getAction } from "../actions/catalog.js";
import type { ActionRequest } from "../actions/types.js";
import { getRole } from "../roles/catalog.js";
import type { Player } from "../types.js";
import type { AIKnowledge } from "./knowledge.js";
import { PERSONALITY_PROFILES, isRiskyAction, type PersonalityProfile } from "./personalities.js";

const OPEN_ACTION_IDS = ["bribe", "steal", "form_alliance"] as const;
/** Actions whose target is picked by chasing suspicion rather than avoiding
 * it. "protect" belongs here too: a Guardian should shield whoever looks
 * most under threat — the same seat a Traitor is most likely to go for —
 * not whichever stranger happens to look friendliest. That overlap is what
 * gives protection a real chance of actually blocking an attack. */
const SUSPICION_SEEKING_ACTIONS = new Set(["attack", "sabotage", "investigate", "spy", "steal", "protect"]);
const BRIBE_OFFER = 25;

/**
 * Rule-based / Utility AI (section 30) — never an LLM call per decision.
 * Every candidate (action, target) pair gets a score from the bot's
 * personality weights + its own private knowledge, the best one wins with
 * a jitter term mixed in so bots aren't perfectly predictable. Nothing
 * here reads match/role state beyond what's already inside `knowledge`
 * (built exclusively from redacted events) plus this bot's own Player
 * object and the public alive-player list — a bot can't act on
 * information it was never shown.
 */
export class AIDecisionEngine {
  constructor(private readonly rng: SecureRng = defaultRng) {}

  decideAction(knowledge: AIKnowledge, self: Player, alivePlayers: readonly Player[]): ActionRequest | null {
    const profile = PERSONALITY_PROFILES[knowledge.personality];
    const role = getRole(knowledge.roleId);

    const candidateActionIds = new Set<string>(OPEN_ACTION_IDS);
    if (role.abilityActionId) candidateActionIds.add(role.abilityActionId);

    let best: { actionId: string; targetSeatId?: string; score: number } | null = null;

    for (const actionId of candidateActionIds) {
      const actionDef = getAction(actionId);
      if (actionDef.restrictedToRoleId && actionDef.restrictedToRoleId !== knowledge.roleId) continue;

      const isOwnAbility = actionId === role.abilityActionId;

      if (!actionDef.requiresTarget) {
        const score = this.scoreCandidate(actionId, self.seatId, self.seatId, knowledge, profile, isOwnAbility);
        if (!best || score > best.score) best = { actionId, score };
        continue;
      }

      for (const target of alivePlayers) {
        if (target.seatId === self.seatId && !actionDef.allowsSelfTarget) continue;
        if (actionId === "protect" && target.seatId === knowledge.lastProtectedSeatId) continue;

        const score = this.scoreCandidate(actionId, target.seatId, self.seatId, knowledge, profile, isOwnAbility);
        if (!best || score > best.score) best = { actionId, targetSeatId: target.seatId, score };
      }
    }

    if (!best) return null;
    if (best.actionId === "protect") knowledge.lastProtectedSeatId = best.targetSeatId;

    const request: ActionRequest = {
      seatId: self.seatId,
      actionId: best.actionId,
      submittedAt: Date.now(),
      ...(best.targetSeatId ? { targetSeatId: best.targetSeatId } : {}),
      ...(best.actionId === "bribe" ? { goldOffer: Math.min(BRIBE_OFFER, self.resources.gold) } : {})
    };
    return request;
  }

  /** Section 25/28: bots vote too, and not as perfect optimizers — no
   * per-choice risk metadata exists yet, so this stays an honest random
   * pick rather than faking precision the bot doesn't have. */
  decideVote(choiceIds: readonly string[]): string {
    return this.rng.pick(choiceIds);
  }

  private scoreCandidate(
    actionId: string,
    targetSeatId: string,
    selfSeatId: string,
    knowledge: AIKnowledge,
    profile: PersonalityProfile,
    isOwnAbility: boolean
  ): number {
    const baseWeight = profile.actionWeights[actionId] ?? 1.0;

    // Both branches start from the same 0.2 floor and the same 0.6 swing,
    // so "nobody's under suspicion yet" doesn't structurally starve every
    // role's own ability in favor of generic social actions the way an
    // asymmetric 0.2-vs-0.65 baseline used to (see git history/balance
    // simulator: that bug meant Traitor/Guardian/Investigator/Spy almost
    // never used their ability, so King/Citizen/Commander won ~100% of
    // matches just by nobody ever threatening them).
    let targetScore = 0.5;
    if (targetSeatId !== selfSeatId) {
      const suspicion = knowledge.suspicion.get(targetSeatId) ?? 20;
      const relationship = knowledge.relationships.get(targetSeatId) ?? 0;
      targetScore = SUSPICION_SEEKING_ACTIONS.has(actionId)
        ? 0.2 + (suspicion / 100) * 0.6
        : 0.2 + ((100 - suspicion) / 200 + (relationship + 100) / 400) * 0.6;
    }

    const riskFactor = isRiskyAction(actionId) ? 0.5 + profile.riskTolerance * 0.5 : 1.0;
    // A bot has a personal stake in the one power that's actually theirs —
    // this is what makes an Investigator investigate, a Guardian protect,
    // and a Traitor eventually swing at someone instead of everyone
    // defaulting to safe small talk forever (section 5: bots must act on
    // their role, not just vibes).
    const abilityBonus = isOwnAbility ? 1.6 : 1.0;
    const jitterNoise = ((this.rng.int(0, 2001) - 1000) / 1000) * profile.jitter;

    return baseWeight * abilityBonus * (0.3 + targetScore) * riskFactor + jitterNoise;
  }
}
