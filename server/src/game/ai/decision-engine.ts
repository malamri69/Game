import { secureRng as defaultRng, type SecureRng } from "../../security/rng.js";
import { getAction } from "../actions/catalog.js";
import type { ActionRequest } from "../actions/types.js";
import { getRole } from "../roles/catalog.js";
import type { Player } from "../types.js";
import type { AIKnowledge } from "./knowledge.js";
import { PERSONALITY_PROFILES, isRiskyAction, type PersonalityProfile } from "./personalities.js";

const OPEN_ACTION_IDS = ["bribe", "steal", "form_alliance"] as const;
const HOSTILE_TARGET_ACTIONS = new Set(["attack", "sabotage", "investigate", "spy", "steal"]);
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

      if (!actionDef.requiresTarget) {
        const score = this.scoreCandidate(actionId, self.seatId, self.seatId, knowledge, profile);
        if (!best || score > best.score) best = { actionId, score };
        continue;
      }

      for (const target of alivePlayers) {
        if (target.seatId === self.seatId && !actionDef.allowsSelfTarget) continue;
        if (actionId === "protect" && target.seatId === knowledge.lastProtectedSeatId) continue;

        const score = this.scoreCandidate(actionId, target.seatId, self.seatId, knowledge, profile);
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
    profile: PersonalityProfile
  ): number {
    const baseWeight = profile.actionWeights[actionId] ?? 1.0;

    let targetScore = 0.5;
    if (targetSeatId !== selfSeatId) {
      const suspicion = knowledge.suspicion.get(targetSeatId) ?? 20;
      const relationship = knowledge.relationships.get(targetSeatId) ?? 0;
      targetScore = HOSTILE_TARGET_ACTIONS.has(actionId)
        ? suspicion / 100
        : (100 - suspicion) / 200 + (relationship + 100) / 400;
    }

    const riskFactor = isRiskyAction(actionId) ? 0.4 + profile.riskTolerance * 0.6 : 1.0;
    const jitterNoise = ((this.rng.int(0, 2001) - 1000) / 1000) * profile.jitter;

    return baseWeight * (0.3 + targetScore) * riskFactor + jitterNoise;
  }
}
