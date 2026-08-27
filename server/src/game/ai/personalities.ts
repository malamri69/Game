import type { BotPersonality } from "../types.js";

/**
 * The 6 bot personalities from section 28. Each is a set of weights fed
 * into the utility scorer (decision-engine.ts) — not a separate code path
 * per personality, so adding a 7th personality later is just a new row
 * here, no engine changes.
 */
export interface PersonalityProfile {
  /** actionId -> multiplier on that action's base utility score (1.0 = neutral). */
  actionWeights: Partial<Record<string, number>>;
  /** 0..1: how much a risky action's score gets scaled up (high) or down (low). */
  riskTolerance: number;
  /** 0..1: magnitude of random noise mixed into every score — keeps the bot from being a perfect, predictable optimizer (section 5). */
  jitter: number;
}

export const PERSONALITY_PROFILES: Record<BotPersonality, PersonalityProfile> = {
  politician: {
    actionWeights: { form_alliance: 1.8, bribe: 1.4, royal_order: 1.2, attack: 0.3, steal: 0.4, sabotage: 0.5 },
    riskTolerance: 0.25,
    jitter: 0.15
  },
  aggressive: {
    actionWeights: { attack: 1.8, sabotage: 1.5, steal: 1.3, form_alliance: 0.5 },
    riskTolerance: 0.8,
    jitter: 0.2
  },
  deceiver: {
    actionWeights: { bribe: 1.5, form_alliance: 1.3, steal: 1.2, trade: 1.1 },
    riskTolerance: 0.6,
    jitter: 0.35
  },
  coward: {
    actionWeights: { protect: 1.6, form_alliance: 1.1, attack: 0.2, steal: 0.2, sabotage: 0.3 },
    riskTolerance: 0.15,
    jitter: 0.1
  },
  opportunist: {
    actionWeights: { bribe: 1.2, form_alliance: 1.2, attack: 1.0, steal: 1.0 },
    riskTolerance: 0.5,
    jitter: 0.25
  },
  analyst: {
    actionWeights: { investigate: 1.8, spy: 1.8, protect: 1.2 },
    riskTolerance: 0.35,
    jitter: 0.1
  }
};

const RISKY_ACTIONS = new Set(["attack", "steal", "sabotage"]);

export function isRiskyAction(actionId: string): boolean {
  return RISKY_ACTIONS.has(actionId);
}
