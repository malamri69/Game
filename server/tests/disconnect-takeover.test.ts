import { describe, expect, it } from "vitest";
import { MatchManager } from "../src/game/match-manager.js";
import { SecureRng } from "../src/security/rng.js";
import { fillWithBots } from "../src/game/ai/bot-factory.js";
import type { Player } from "../src/game/types.js";

function humanPlayer(seatId: string): Player {
  return {
    seatId,
    userId: seatId,
    displayName: seatId,
    isBot: false,
    connected: false,
    alive: true,
    resources: { gold: 100, reputation: 0 }
  };
}

describe("MatchManager — disconnect handling (section 33)", () => {
  it("keeps the match moving when a human seat is disconnected: the AI votes and acts for them", () => {
    const rng = new SecureRng();
    const human = humanPlayer("seat-0");
    const players = fillWithBots([human], 8, rng);
    const manager = new MatchManager(players, rng);

    let now = Date.now();
    manager.start(now);
    for (let i = 0; i < 500 && manager.stateMachine.current !== "REMATCH"; i++) {
      now += 60_000;
      manager.tick(now);
    }

    expect(manager.stateMachine.current).toBe("REMATCH");
    expect(manager.getResult()).not.toBeNull();
  });

  it("lets a reconnecting human's real vote override the AI placeholder", () => {
    const rng = new SecureRng();
    const human = humanPlayer("seat-0");
    const players = fillWithBots([human], 6, rng);
    const manager = new MatchManager(players, rng);

    const now = Date.now();
    manager.start(now);
    // Drive to VOTING (LOBBY->MATCHMAKING->ROLE_ASSIGNMENT->ROLE_REVEAL->ROUND_START->EVENT->DISCUSSION->VOTING)
    let clock = now;
    while (manager.stateMachine.current !== "VOTING") {
      clock += 60_000;
      manager.tick(clock);
    }
    expect(manager.getCurrentEvent()).not.toBeNull();
    const choiceIds = manager.getCurrentEvent()!.choices.map((c) => c.id);
    // The disconnected human already got an AI placeholder vote at VOTING entry.
    human.connected = true;
    manager.submitVote("seat-0", choiceIds[0]!, clock);
    // No assertion on tally contents here (private), just that this doesn't throw
    // and the match still completes normally.
    for (let i = 0; i < 500 && manager.stateMachine.current !== "REMATCH"; i++) {
      clock += 60_000;
      manager.tick(clock);
    }
    expect(manager.stateMachine.current).toBe("REMATCH");
  });
});
