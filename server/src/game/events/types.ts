import type { LocalizedText } from "../roles/types.js";

export type EffectScope = "kingdom" | "self" | "random_player" | "king";

export interface EventEffect {
  scope: EffectScope;
  goldDelta?: number;
  reputationDelta?: number;
  /** Short "what just happened" line per section 65 — must read in seconds. */
  description: LocalizedText;
}

export interface EventChoice {
  id: string;
  label: LocalizedText;
  effects: EventEffect[];
}

export interface EventRequirements {
  minRound?: number;
  maxRound?: number;
}

export interface EventDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Overrides config.timers.eventMs when set. */
  durationMs?: number;
  /** 2-3 choices per section 13 — never more, keeps the decision under 10s. */
  choices: EventChoice[];
  requirements?: EventRequirements;
}
