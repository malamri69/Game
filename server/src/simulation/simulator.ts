import { MatchManager } from "../game/match-manager.js";
import { fillWithBots } from "../game/ai/bot-factory.js";
import { SecureRng } from "../security/rng.js";

export interface SimulationSummary {
  matches: number;
  playerCount: number;
  winRateByRole: Record<string, number>;
  appearancesByRole: Record<string, number>;
  averageRounds: number;
}

const MAX_TICKS_PER_MATCH = 500;
const TICK_JUMP_MS = 60_000;

/**
 * Section 63: runs N bots-vs-bots matches headlessly through MatchManager
 * and aggregates per-role win rates, so imbalance (a role winning way more
 * or less than a fair share) shows up as data instead of a guess. This is
 * the same MatchManager a real match runs on — no simulation-only code
 * path to drift out of sync with production behavior.
 */
export function simulateMatches(matchCount: number, playerCount = 8): SimulationSummary {
  const winsByRole: Record<string, number> = {};
  const appearancesByRole: Record<string, number> = {};
  let totalRounds = 0;
  let completed = 0;

  for (let i = 0; i < matchCount; i++) {
    const rng = new SecureRng();
    const players = fillWithBots([], playerCount, rng);
    const manager = new MatchManager(players, rng);
    manager.start();

    let now = Date.now();
    for (let step = 0; step < MAX_TICKS_PER_MATCH && manager.stateMachine.current !== "REMATCH"; step++) {
      now += TICK_JUMP_MS;
      manager.tick(now);
    }

    const result = manager.getResult();
    if (!result) continue;
    completed += 1;
    totalRounds += manager.match.round;

    for (const p of manager.match.players) {
      if (!p.roleId) continue;
      appearancesByRole[p.roleId] = (appearancesByRole[p.roleId] ?? 0) + 1;
      if (result.winnerSeatIds.includes(p.seatId)) {
        winsByRole[p.roleId] = (winsByRole[p.roleId] ?? 0) + 1;
      }
    }
  }

  const winRateByRole: Record<string, number> = {};
  for (const roleId of Object.keys(appearancesByRole)) {
    const appearances = appearancesByRole[roleId] ?? 0;
    winRateByRole[roleId] = appearances > 0 ? (winsByRole[roleId] ?? 0) / appearances : 0;
  }

  return {
    matches: completed,
    playerCount,
    winRateByRole,
    appearancesByRole,
    averageRounds: completed > 0 ? totalRounds / completed : 0
  };
}

const IMBALANCE_LOW = 0.15;
const IMBALANCE_HIGH = 0.65;

export function findImbalancedRoles(summary: SimulationSummary): string[] {
  return Object.entries(summary.winRateByRole)
    .filter(([, rate]) => rate < IMBALANCE_LOW || rate > IMBALANCE_HIGH)
    .map(([roleId]) => roleId);
}
