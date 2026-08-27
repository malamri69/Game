import { describe, expect, it } from "vitest";
import { ResolutionEngine } from "../src/game/resolution/engine.js";
import { createResolutionContext } from "../src/game/resolution/types.js";
import { SecureRng } from "../src/security/rng.js";
import type { Player } from "../src/game/types.js";
import type { ActionRequest } from "../src/game/actions/types.js";
import { buildMatchEndContext } from "../src/game/roles/win-context.js";
import { getRole } from "../src/game/roles/catalog.js";

class FixedRng extends SecureRng {
  constructor(private readonly fixed: number) {
    super();
  }
  override int(): number {
    return this.fixed;
  }
}

function player(seatId: string, roleId: string, overrides: Partial<Player> = {}): Player {
  return {
    seatId,
    userId: seatId,
    displayName: seatId,
    isBot: false,
    connected: true,
    alive: true,
    resources: { gold: 100, reputation: 0 },
    roleId,
    ...overrides
  };
}

function seatMap(players: Player[]): Map<string, Player> {
  return new Map(players.map((p) => [p.seatId, p]));
}

describe("ResolutionEngine", () => {
  it("blocks an attack on a protected target and credits the guardian", () => {
    const king = player("king", "king");
    const traitor = player("traitor", "traitor");
    const guardian = player("guardian", "guardian");
    const players = seatMap([king, traitor, guardian]);
    const ctx = createResolutionContext(king.seatId);
    const actions: ActionRequest[] = [
      { seatId: guardian.seatId, actionId: "protect", targetSeatId: king.seatId, submittedAt: 0 },
      { seatId: traitor.seatId, actionId: "attack", targetSeatId: king.seatId, submittedAt: 0 }
    ];
    const engine = new ResolutionEngine(new SecureRng());
    const events = engine.resolve(1, actions, players, ctx);

    expect(king.alive).toBe(true);
    expect(ctx.kingOverthrown).toBe(false);
    expect(ctx.successfulProtectionsBySeat.get(guardian.seatId)).toBe(1);
    expect(events.some((e) => e.type === "attack_blocked")).toBe(true);
  });

  it("lets an unprotected attack on the king succeed and satisfies the traitor's win condition", () => {
    const king = player("king", "king");
    const traitor = player("traitor", "traitor");
    const players = seatMap([king, traitor]);
    const ctx = createResolutionContext(king.seatId);
    const actions: ActionRequest[] = [{ seatId: traitor.seatId, actionId: "attack", targetSeatId: king.seatId, submittedAt: 0 }];
    const engine = new ResolutionEngine(new SecureRng());
    engine.resolve(1, actions, players, ctx);

    expect(king.alive).toBe(false);
    expect(ctx.kingOverthrown).toBe(true);
    expect(ctx.traitorAchievedGoal).toBe(true);
    const matchEnd = buildMatchEndContext([king, traitor], ctx);
    expect(getRole("traitor").evaluateWin(matchEnd, traitor.seatId)).toBe(true);
    expect(getRole("king").evaluateWin(matchEnd, king.seatId)).toBe(false);
  });

  it("nullifies an arrested player's queued action via sabotage priority", () => {
    const king = player("king", "king");
    const traitor = player("traitor", "traitor");
    const commander = player("commander", "commander");
    const players = seatMap([king, traitor, commander]);
    const ctx = createResolutionContext(king.seatId);
    const actions: ActionRequest[] = [
      { seatId: commander.seatId, actionId: "sabotage", targetSeatId: traitor.seatId, submittedAt: 0 },
      { seatId: traitor.seatId, actionId: "attack", targetSeatId: king.seatId, submittedAt: 0 }
    ];
    const engine = new ResolutionEngine(new SecureRng());
    const events = engine.resolve(1, actions, players, ctx);

    expect(king.alive).toBe(true);
    expect(events.some((e) => e.type === "arrested")).toBe(true);
    expect(events.some((e) => e.type === "attack_success" || e.type === "attack_blocked")).toBe(false);
  });

  it("reveals faction-based info on investigate and credits intel only for non-crown targets", () => {
    const investigator = player("investigator", "investigator");
    const traitor = player("traitor", "traitor");
    const citizen = player("citizen", "citizen");
    const players = seatMap([investigator, traitor, citizen]);
    const ctx = createResolutionContext("king");
    const engine = new ResolutionEngine(new SecureRng());

    const onTraitor = engine.resolve(
      1,
      [{ seatId: investigator.seatId, actionId: "investigate", targetSeatId: traitor.seatId, submittedAt: 0 }],
      players,
      ctx
    );
    expect(ctx.intelPointsBySeat.get(investigator.seatId)).toBe(1);
    expect(onTraitor[0]!.visibleTo).toEqual([investigator.seatId]);

    engine.resolve(
      2,
      [{ seatId: investigator.seatId, actionId: "investigate", targetSeatId: citizen.seatId, submittedAt: 0 }],
      players,
      ctx
    );
    expect(ctx.intelPointsBySeat.get(investigator.seatId)).toBe(1);
  });

  it("transfers gold deterministically on a successful steal (rng forced low)", () => {
    const thief = player("thief", "citizen");
    const victim = player("victim", "citizen", { resources: { gold: 100, reputation: 0 } });
    const players = seatMap([thief, victim]);
    const ctx = createResolutionContext("king");
    const engine = new ResolutionEngine(new FixedRng(0));
    engine.resolve(1, [{ seatId: thief.seatId, actionId: "steal", targetSeatId: victim.seatId, submittedAt: 0 }], players, ctx);
    expect(thief.resources.gold).toBe(130);
    expect(victim.resources.gold).toBe(70);
  });

  it("penalizes reputation on a failed steal (rng forced high) without moving gold", () => {
    const thief = player("thief", "citizen");
    const victim = player("victim", "citizen");
    const players = seatMap([thief, victim]);
    const ctx = createResolutionContext("king");
    const engine = new ResolutionEngine(new FixedRng(99));
    engine.resolve(1, [{ seatId: thief.seatId, actionId: "steal", targetSeatId: victim.seatId, submittedAt: 0 }], players, ctx);
    expect(thief.resources.gold).toBe(100);
    expect(victim.resources.gold).toBe(100);
    expect(thief.resources.reputation).toBe(-1);
  });

  it("increments successfulTradesBySeat on a merchant trade", () => {
    const merchant = player("merchant", "merchant");
    const other = player("other", "citizen");
    const players = seatMap([merchant, other]);
    const ctx = createResolutionContext("king");
    const engine = new ResolutionEngine(new SecureRng());
    engine.resolve(1, [{ seatId: merchant.seatId, actionId: "trade", targetSeatId: other.seatId, submittedAt: 0 }], players, ctx);
    expect(ctx.successfulTradesBySeat.get(merchant.seatId)).toBe(1);
    expect(merchant.resources.gold).toBeGreaterThan(100);
  });

  it("moves gold on bribe and dents the briber's reputation", () => {
    const briber = player("briber", "citizen");
    const target = player("target", "citizen");
    const players = seatMap([briber, target]);
    const ctx = createResolutionContext("king");
    const engine = new ResolutionEngine(new SecureRng());
    engine.resolve(1, [{ seatId: briber.seatId, actionId: "bribe", targetSeatId: target.seatId, goldOffer: 40, submittedAt: 0 }], players, ctx);
    expect(briber.resources.gold).toBe(60);
    expect(target.resources.gold).toBe(140);
    expect(briber.resources.reputation).toBe(-1);
  });
});
