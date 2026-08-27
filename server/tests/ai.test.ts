import { describe, expect, it } from "vitest";
import { AIDecisionEngine } from "../src/game/ai/decision-engine.js";
import { adjustSuspicion, createAIKnowledge } from "../src/game/ai/knowledge.js";
import { applyEventsToKnowledge } from "../src/game/ai/knowledge-update.js";
import { createBotPlayer, fillWithBots } from "../src/game/ai/bot-factory.js";
import { SecureRng } from "../src/security/rng.js";
import type { Player } from "../src/game/types.js";
import type { PublicResolutionEvent } from "../src/game/resolution/types.js";

function player(seatId: string, overrides: Partial<Player> = {}): Player {
  return {
    seatId,
    userId: seatId,
    displayName: seatId,
    isBot: false,
    connected: true,
    alive: true,
    resources: { gold: 100, reputation: 0 },
    ...overrides
  };
}

describe("bot-factory", () => {
  const rng = new SecureRng();

  it("creates bots that are structurally identical Player objects, just flagged", () => {
    const bot = createBotPlayer("seat-5", rng);
    expect(bot.isBot).toBe(true);
    expect(bot.botPersonality).toBeDefined();
    expect(bot.seatId).toBe("seat-5");
    expect(bot.alive).toBe(true);
  });

  it("fills a lobby up to the target count without touching existing players", () => {
    const humans = [player("seat-0"), player("seat-1")];
    const filled = fillWithBots(humans, 6, rng);
    expect(filled).toHaveLength(6);
    expect(filled[0]).toBe(humans[0]);
    expect(filled.slice(2).every((p) => p.isBot)).toBe(true);
  });
});

describe("AIKnowledge", () => {
  it("starts with a neutral baseline for every other seat, none for itself", () => {
    const knowledge = createAIKnowledge("seat-0", "analyst", "investigator", ["seat-0", "seat-1", "seat-2"]);
    expect(knowledge.suspicion.has("seat-0")).toBe(false);
    expect(knowledge.suspicion.get("seat-1")).toBe(20);
  });

  it("never exceeds the 0-100 suspicion bounds", () => {
    const knowledge = createAIKnowledge("seat-0", "analyst", "investigator", ["seat-0", "seat-1"]);
    adjustSuspicion(knowledge, "seat-1", 1000);
    expect(knowledge.suspicion.get("seat-1")).toBe(100);
    adjustSuspicion(knowledge, "seat-1", -1000);
    expect(knowledge.suspicion.get("seat-1")).toBe(0);
  });
});

describe("applyEventsToKnowledge", () => {
  it("raises suspicion sharply on a target revealed hostile by investigation", () => {
    const knowledge = createAIKnowledge("seat-inv", "analyst", "investigator", ["seat-inv", "seat-t"]);
    const events: PublicResolutionEvent[] = [
      {
        round: 1,
        type: "investigate_result",
        actorSeatId: "seat-inv",
        targetSeatId: "seat-t",
        description: { ar: "هذا اللاعب ينتمي إلى جهة معادية للمملكة.", en: "This player belongs to a faction hostile to the crown." }
      }
    ];
    applyEventsToKnowledge(knowledge, events);
    expect(knowledge.suspicion.get("seat-t")).toBeGreaterThan(60);
  });

  it("never learns an actor's identity when the event withholds it (e.g. a hidden attack)", () => {
    const knowledge = createAIKnowledge("seat-c", "coward", "citizen", ["seat-c", "seat-x"]);
    const events: PublicResolutionEvent[] = [
      { round: 1, type: "attack_success", targetSeatId: "seat-x", description: { ar: "x", en: "y" } }
    ];
    // No actorSeatId on the event at all — simulates what a bystander client actually receives.
    expect(() => applyEventsToKnowledge(knowledge, events)).not.toThrow();
    expect(knowledge.relationships.size).toBe(1);
  });

  it("burns the relationship hard when a bot's own steal victim catches them", () => {
    const knowledge = createAIKnowledge("seat-victim", "coward", "citizen", ["seat-victim", "seat-thief"]);
    const events: PublicResolutionEvent[] = [
      { round: 1, type: "steal_failed", actorSeatId: "seat-thief", targetSeatId: "seat-victim", description: { ar: "x", en: "y" } }
    ];
    applyEventsToKnowledge(knowledge, events);
    expect(knowledge.relationships.get("seat-thief")).toBeLessThan(0);
  });
});

describe("AIDecisionEngine", () => {
  const rng = new SecureRng();
  const engine = new AIDecisionEngine(rng);

  it("only ever proposes actions the bot's role is actually allowed to take", () => {
    const self = player("seat-citizen", { roleId: "citizen" });
    const others = [player("seat-1"), player("seat-2")];
    const knowledge = createAIKnowledge(self.seatId, "aggressive", "citizen", [self.seatId, ...others.map((p) => p.seatId)]);
    for (let i = 0; i < 20; i++) {
      const request = engine.decideAction(knowledge, self, [self, ...others]);
      expect(request).not.toBeNull();
      expect(["bribe", "steal", "form_alliance"]).toContain(request!.actionId);
    }
  });

  it("lets a traitor bot use its role ability (attack)", () => {
    const self = player("seat-traitor", { roleId: "traitor" });
    const others = [player("seat-1"), player("seat-2")];
    const knowledge = createAIKnowledge(self.seatId, "aggressive", "traitor", [self.seatId, ...others.map((p) => p.seatId)]);
    const actionsUsed = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const request = engine.decideAction(knowledge, self, [self, ...others]);
      if (request) actionsUsed.add(request.actionId);
    }
    expect(actionsUsed.has("attack")).toBe(true);
  });

  it("respects the guardian's can't-protect-the-same-seat-twice-in-a-row rule", () => {
    const self = player("seat-guardian", { roleId: "guardian" });
    const only = player("seat-1");
    const knowledge = createAIKnowledge(self.seatId, "coward", "guardian", [self.seatId, only.seatId]);
    knowledge.lastProtectedSeatId = only.seatId;
    const request = engine.decideAction(knowledge, self, [self, only]);
    // The only other living player is off-limits this round, so protect
    // shouldn't be the chosen action (open actions can still target them).
    if (request?.actionId === "protect") {
      expect(request.targetSeatId).not.toBe(only.seatId);
    }
  });

  it("never returns a self-target for an action that disallows it", () => {
    const self = player("seat-traitor", { roleId: "traitor" });
    const others = [player("seat-1")];
    const knowledge = createAIKnowledge(self.seatId, "aggressive", "traitor", [self.seatId, ...others.map((p) => p.seatId)]);
    for (let i = 0; i < 20; i++) {
      const request = engine.decideAction(knowledge, self, [self, ...others]);
      if (request?.actionId === "attack") {
        expect(request.targetSeatId).not.toBe(self.seatId);
      }
    }
  });

  it("decideVote always returns one of the offered choices", () => {
    for (let i = 0; i < 10; i++) {
      expect(["A", "B", "C"]).toContain(engine.decideVote(["A", "B", "C"]));
    }
  });
});
