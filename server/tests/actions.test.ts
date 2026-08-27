import { describe, expect, it } from "vitest";
import { ACTION_CATALOG, getAction } from "../src/game/actions/catalog.js";
import { ActionQueue, validateAction } from "../src/game/actions/validation.js";
import type { Player } from "../src/game/types.js";

function player(overrides: Partial<Player>): Player {
  return {
    seatId: "seat-0",
    userId: "u0",
    displayName: "P0",
    isBot: false,
    connected: true,
    alive: true,
    resources: { gold: 100, reputation: 0 },
    ...overrides
  };
}

describe("action catalog", () => {
  it("covers the section-15 action list", () => {
    const ids = Object.keys(ACTION_CATALOG).sort();
    expect(ids).toEqual(
      ["attack", "bribe", "form_alliance", "investigate", "protect", "royal_order", "sabotage", "spy", "steal", "trade"].sort()
    );
  });

  it("getAction throws for unknown ids", () => {
    expect(() => getAction("nope")).toThrow();
  });
});

describe("validateAction", () => {
  const traitor = player({ seatId: "seat-t", roleId: "traitor" });
  const citizen = player({ seatId: "seat-c", roleId: "citizen" });
  const bySeat = new Map([
    [traitor.seatId, traitor],
    [citizen.seatId, citizen]
  ]);

  it("allows a role-restricted action for the correct role", () => {
    const result = validateAction(
      { seatId: traitor.seatId, actionId: "attack", targetSeatId: citizen.seatId, submittedAt: 0 },
      traitor,
      bySeat
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a role-restricted action for the wrong role", () => {
    const result = validateAction(
      { seatId: citizen.seatId, actionId: "attack", targetSeatId: traitor.seatId, submittedAt: 0 },
      citizen,
      bySeat
    );
    expect(result).toEqual({ ok: false, reason: "role_not_allowed" });
  });

  it("allows the open social actions for any role", () => {
    const result = validateAction(
      { seatId: citizen.seatId, actionId: "form_alliance", targetSeatId: traitor.seatId, submittedAt: 0 },
      citizen,
      bySeat
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a dead actor", () => {
    const dead = player({ seatId: "seat-d", alive: false, roleId: "citizen" });
    const result = validateAction({ seatId: dead.seatId, actionId: "form_alliance", targetSeatId: citizen.seatId, submittedAt: 0 }, dead, bySeat);
    expect(result).toEqual({ ok: false, reason: "actor_dead" });
  });

  it("rejects self-targeting an action that disallows it", () => {
    const result = validateAction(
      { seatId: traitor.seatId, actionId: "attack", targetSeatId: traitor.seatId, submittedAt: 0 },
      traitor,
      bySeat
    );
    expect(result).toEqual({ ok: false, reason: "self_target_not_allowed" });
  });

  it("rejects a gold offer exceeding the actor's balance", () => {
    const result = validateAction(
      { seatId: citizen.seatId, actionId: "bribe", targetSeatId: traitor.seatId, goldOffer: 9999, submittedAt: 0 },
      citizen,
      bySeat
    );
    expect(result).toEqual({ ok: false, reason: "insufficient_gold" });
  });

  it("rejects a missing target for a target-required action", () => {
    const result = validateAction({ seatId: traitor.seatId, actionId: "attack", submittedAt: 0 }, traitor, bySeat);
    expect(result).toEqual({ ok: false, reason: "target_required" });
  });
});

describe("ActionQueue", () => {
  it("keeps only the latest submission per seat", () => {
    const queue = new ActionQueue();
    queue.submit({ seatId: "seat-1", actionId: "form_alliance", targetSeatId: "seat-2", submittedAt: 0 });
    queue.submit({ seatId: "seat-1", actionId: "steal", targetSeatId: "seat-3", submittedAt: 1 });
    expect(queue.size()).toBe(1);
    expect(queue.all()[0]!.actionId).toBe("steal");
  });

  it("holds one entry per distinct seat", () => {
    const queue = new ActionQueue();
    queue.submit({ seatId: "seat-1", actionId: "form_alliance", targetSeatId: "seat-2", submittedAt: 0 });
    queue.submit({ seatId: "seat-2", actionId: "steal", targetSeatId: "seat-1", submittedAt: 0 });
    expect(queue.size()).toBe(2);
  });
});
