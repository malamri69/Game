import { describe, expect, it } from "vitest";
import { MatchManager } from "../src/game/match-manager.js";
import { SecureRng } from "../src/security/rng.js";
import { fillWithBots } from "../src/game/ai/bot-factory.js";

/** Runs a match to completion by repeatedly jumping the clock forward past
 * every timer, exactly like a headless simulator would (this is also the
 * shape Phase 12's balance simulator will run at scale). */
function runToCompletion(manager: MatchManager, maxSteps = 500) {
  let now = Date.now();
  manager.start(now);
  for (let i = 0; i < maxSteps; i++) {
    if (manager.stateMachine.current === "REMATCH") return;
    now += 60_000; // jump well past any configured timer
    manager.tick(now);
  }
  throw new Error("match did not complete within maxSteps");
}

describe("MatchManager — full match lifecycle (section 75 Definition of Done, bots-only)", () => {
  it("runs an 8-bot match from LOBBY to a REMATCH-ready result with a declared winner", () => {
    const rng = new SecureRng();
    const players = fillWithBots([], 8, rng);
    const manager = new MatchManager(players, rng);

    runToCompletion(manager);

    expect(manager.stateMachine.current).toBe("REMATCH");
    const result = manager.getResult();
    expect(result).not.toBeNull();
    expect(result!.winnerSeatIds.length).toBeGreaterThan(0);
    // Every seat got a role.
    for (const p of manager.match.players) {
      expect(p.roleId).toBeDefined();
    }
    // The match produced a real timeline (section 40's end reveal needs this).
    expect(result!.timeline.length).toBeGreaterThan(0);
  });

  it("plays out the configured number of rounds before branching to the final tail", () => {
    const rng = new SecureRng();
    const players = fillWithBots([], 6, rng);
    const manager = new MatchManager(players, rng);
    runToCompletion(manager);
    expect(manager.match.round).toBe(manager.match.totalRounds);
  });

  it("supports 6 through 10 players without throwing", () => {
    for (let n = 6; n <= 10; n++) {
      const rng = new SecureRng();
      const players = fillWithBots([], n, rng);
      const manager = new MatchManager(players, rng);
      expect(() => runToCompletion(manager)).not.toThrow();
    }
  });

  it("gives a human seat a real secret objective distinct from raw role internals", () => {
    const rng = new SecureRng();
    const human = { seatId: "seat-0", userId: "human-1", displayName: "Player", isBot: false, connected: true, alive: true, resources: { gold: 100, reputation: 0 } };
    const players = fillWithBots([human], 8, rng);
    const manager = new MatchManager(players, rng);
    manager.start();
    const secret = manager.getSecretInfo("seat-0");
    expect(secret).toBeDefined();
    expect(secret!.ar.length).toBeGreaterThan(0);
  });

  it("rejects a human action submitted outside SECRET_ACTIONS", () => {
    const rng = new SecureRng();
    const players = fillWithBots([], 6, rng);
    const manager = new MatchManager(players, rng);
    manager.start();
    const result = manager.submitAction({ seatId: "seat-0", actionId: "form_alliance", targetSeatId: "seat-1", submittedAt: Date.now() });
    expect(result.ok).toBe(false);
  });
});
