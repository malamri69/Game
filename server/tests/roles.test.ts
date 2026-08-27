import { describe, expect, it } from "vitest";
import { SecureRng } from "../src/security/rng.js";
import { assignRoles, generateSecretInfo, roleSetForPlayerCount, ownRoleView } from "../src/game/roles/assignment.js";
import { getRole } from "../src/game/roles/catalog.js";
import type { Player } from "../src/game/types.js";

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    seatId: `seat-${i}`,
    userId: `user-${i}`,
    displayName: `Player ${i}`,
    isBot: false,
    connected: true,
    alive: true,
    resources: { gold: 100, reputation: 0 }
  }));
}

describe("role sets", () => {
  it("supports 6 through 10 players with matching role-set sizes", () => {
    for (let n = 6; n <= 10; n++) {
      expect(roleSetForPlayerCount(n)).toHaveLength(n);
    }
  });

  it("always includes exactly one king, traitor, investigator and guardian", () => {
    for (let n = 6; n <= 10; n++) {
      const set = roleSetForPlayerCount(n);
      for (const core of ["king", "traitor", "investigator", "guardian"]) {
        expect(set.filter((r) => r === core)).toHaveLength(1);
      }
    }
  });
});

describe("assignRoles", () => {
  const rng = new SecureRng();

  it("assigns a role to every player with no duplicates beyond the role set's own repeats", () => {
    const players = makePlayers(8);
    assignRoles(players, rng);
    for (const p of players) {
      expect(p.roleId).toBeDefined();
      expect(() => getRole(p.roleId!)).not.toThrow();
    }
    const assigned = players.map((p) => p.roleId).sort();
    expect(assigned).toEqual(roleSetForPlayerCount(8).slice().sort());
  });

  it("throws for an unsupported player count", () => {
    const players = makePlayers(4);
    expect(() => assignRoles(players, rng)).toThrow();
  });

  it("never reveals another player's role via ownRoleView", () => {
    const players = makePlayers(6);
    assignRoles(players, rng);
    const view = ownRoleView(players[0]!);
    expect(view.roleId).toBe(players[0]!.roleId);
  });
});

describe("generateSecretInfo", () => {
  it("gives every player a rumor, avoiding their own role where possible", () => {
    const rng = new SecureRng();
    const players = makePlayers(8);
    assignRoles(players, rng);
    const info = generateSecretInfo(players, rng);
    expect(info.size).toBe(players.length);
    for (const p of players) {
      expect(info.get(p.seatId)).toBeDefined();
    }
  });
});

describe("win conditions", () => {
  const baseCtx = {
    kingSeatId: "seat-0",
    kingOverthrown: false,
    aliveSeatIds: new Set(["seat-0", "seat-1"]),
    goldBySeat: new Map<string, number>(),
    successfulTradesBySeat: new Map<string, number>(),
    traitorAchievedGoal: false,
    investigatorCorrectAccusationsBySeat: new Map<string, number>(),
    successfulProtectionsBySeat: new Map<string, number>()
  };

  it("king wins by surviving the match un-overthrown", () => {
    expect(getRole("king").evaluateWin(baseCtx, "seat-0")).toBe(true);
    expect(getRole("king").evaluateWin({ ...baseCtx, kingOverthrown: true }, "seat-0")).toBe(false);
  });

  it("traitor wins only once the resolution engine confirms the goal was achieved", () => {
    expect(getRole("traitor").evaluateWin(baseCtx, "seat-1")).toBe(false);
    expect(getRole("traitor").evaluateWin({ ...baseCtx, traitorAchievedGoal: true }, "seat-1")).toBe(true);
  });

  it("merchant wins on 500 gold OR two successful trades, not requiring both", () => {
    const byGold = { ...baseCtx, goldBySeat: new Map([["seat-1", 500]]) };
    const byTrades = { ...baseCtx, successfulTradesBySeat: new Map([["seat-1", 2]]) };
    expect(getRole("merchant").evaluateWin(byGold, "seat-1")).toBe(true);
    expect(getRole("merchant").evaluateWin(byTrades, "seat-1")).toBe(true);
    expect(getRole("merchant").evaluateWin(baseCtx, "seat-1")).toBe(false);
  });
});
