import { describe, expect, it } from "vitest";
import { MatchStateMachine } from "../src/game/state-machine/machine.js";
import type { Match, MatchTimers } from "../src/game/types.js";

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "match-1",
    code: "K7P9",
    state: "LOBBY",
    stateEnteredAt: 0,
    round: 1,
    totalRounds: 3,
    players: [],
    rngSeed: "seed",
    createdAt: 0,
    ...overrides
  };
}

const timers: MatchTimers = {
  roleRevealMs: 100,
  eventMs: 100,
  votingMs: 100,
  discussionMs: 100,
  secretActionMs: 100,
  resolutionMs: 100,
  finalDecisionMs: 100,
  revealMs: 100,
  rewardsMs: 100
};

describe("MatchStateMachine", () => {
  it("walks the full linear flow up to NEXT_ROUND", () => {
    const match = makeMatch();
    const machine = new MatchStateMachine(match);
    const order = [
      "MATCHMAKING",
      "ROLE_ASSIGNMENT",
      "ROLE_REVEAL",
      "ROUND_START",
      "EVENT",
      "DISCUSSION",
      "VOTING",
      "SECRET_ACTIONS",
      "RESOLUTION",
      "CONSEQUENCES",
      "NEXT_ROUND"
    ];
    for (const expected of order) {
      expect(machine.advance()).toBe(expected);
    }
  });

  it("loops back to ROUND_START and increments round while rounds remain", () => {
    const match = makeMatch({ state: "NEXT_ROUND", round: 1, totalRounds: 3 });
    const machine = new MatchStateMachine(match);
    expect(machine.advance()).toBe("ROUND_START");
    expect(match.round).toBe(2);
  });

  it("branches into the final tail once totalRounds is reached", () => {
    const match = makeMatch({ state: "NEXT_ROUND", round: 3, totalRounds: 3 });
    const machine = new MatchStateMachine(match);
    expect(machine.advance()).toBe("FINAL_EVENT");
    expect(machine.advance()).toBe("FINAL_DECISION");
    expect(machine.advance()).toBe("REVEAL");
    expect(machine.advance()).toBe("REWARDS");
    expect(machine.advance()).toBe("REMATCH");
  });

  it("throws when advancing past the terminal REMATCH state", () => {
    const match = makeMatch({ state: "REMATCH" });
    const machine = new MatchStateMachine(match);
    expect(() => machine.advance()).toThrow();
  });

  it("is server-clock authoritative: isExpired only flips once stateEnteredAt + duration has passed", () => {
    const match = makeMatch({ state: "VOTING", stateEnteredAt: 1000 });
    const machine = new MatchStateMachine(match);
    expect(machine.isExpired(timers, 1050)).toBe(false);
    expect(machine.isExpired(timers, 1100)).toBe(true);
  });

  it("fires change listeners with from/to on every transition", () => {
    const match = makeMatch();
    const machine = new MatchStateMachine(match);
    const seen: Array<[string, string]> = [];
    machine.onChange((_m, from, to) => seen.push([from, to]));
    machine.advance();
    machine.advance();
    expect(seen).toEqual([
      ["LOBBY", "MATCHMAKING"],
      ["MATCHMAKING", "ROLE_ASSIGNMENT"]
    ]);
  });
});
