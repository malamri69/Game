/** Core domain types shared across the game engine. */

export type MatchStateName =
  | "LOBBY"
  | "MATCHMAKING"
  | "ROLE_ASSIGNMENT"
  | "ROLE_REVEAL"
  | "ROUND_START"
  | "EVENT"
  | "DISCUSSION"
  | "VOTING"
  | "SECRET_ACTIONS"
  | "RESOLUTION"
  | "CONSEQUENCES"
  | "NEXT_ROUND"
  | "FINAL_EVENT"
  | "FINAL_DECISION"
  | "REVEAL"
  | "REWARDS"
  | "REMATCH";

export interface PlayerResources {
  gold: number;
  reputation: number;
}

export interface Player {
  /** Stable seat id within the match, e.g. "seat-3". Never the user's real id in broadcasts. */
  seatId: string;
  userId: string;
  displayName: string;
  isBot: boolean;
  botPersonality?: BotPersonality;
  connected: boolean;
  alive: boolean;
  resources: PlayerResources;
  /** Set only server-side once ROLE_ASSIGNMENT runs. Never serialized to other clients. */
  roleId?: string;
}

export type BotPersonality =
  | "politician"
  | "aggressive"
  | "deceiver"
  | "coward"
  | "opportunist"
  | "analyst";

export interface MatchTimers {
  roleRevealMs: number;
  eventMs: number;
  votingMs: number;
  discussionMs: number;
  secretActionMs: number;
  resolutionMs: number;
  finalDecisionMs: number;
  revealMs: number;
  rewardsMs: number;
}

export interface Match {
  id: string;
  code: string;
  state: MatchStateName;
  stateEnteredAt: number;
  round: number;
  totalRounds: number;
  players: Player[];
  rngSeed: string;
  createdAt: number;
}
