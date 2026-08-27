import gameConfigJson from "./game.config.json" with { type: "json" };

export interface GameConfig {
  minPlayers: number;
  maxPlayers: number;
  defaultPlayers: number;
  botBackfillWaitMs: number;
  disconnectGraceMs: number;
  rounds: { min: number; max: number };
  timers: {
    roleRevealMs: number;
    eventMs: number;
    votingMs: number;
    discussionMs: number;
    secretActionMs: number;
    resolutionMs: number;
    finalDecisionMs: number;
    revealMs: number;
    rewardsMs: number;
  };
  economy: { startingGold: number };
  roles: { mvpRoleIds: string[] };
}

// Config is data, not code: change match pacing/role sets by editing
// game.config.json, never by touching state-machine or role logic.
export const gameConfig: GameConfig = gameConfigJson as GameConfig;
