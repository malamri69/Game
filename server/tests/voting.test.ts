import { describe, expect, it } from "vitest";
import { VotingSystem } from "../src/game/voting/tally.js";
import { SecureRng } from "../src/security/rng.js";

describe("VotingSystem", () => {
  const rng = new SecureRng();

  it("tallies votes and picks the clear majority", () => {
    const voting = new VotingSystem();
    voting.submit({ seatId: "s1", choiceId: "A", submittedAt: 0 });
    voting.submit({ seatId: "s2", choiceId: "A", submittedAt: 0 });
    voting.submit({ seatId: "s3", choiceId: "B", submittedAt: 0 });
    const tally = voting.tally(["A", "B", "C"], rng);
    expect(tally.winningChoiceId).toBe("A");
    expect(tally.counts).toEqual({ A: 2, B: 1, C: 0 });
    expect(tally.tieBrokenByRng).toBe(false);
  });

  it("keeps only the latest vote per seat", () => {
    const voting = new VotingSystem();
    voting.submit({ seatId: "s1", choiceId: "A", submittedAt: 0 });
    voting.submit({ seatId: "s1", choiceId: "B", submittedAt: 1 });
    const tally = voting.tally(["A", "B"], rng);
    expect(tally.counts).toEqual({ A: 0, B: 1 });
  });

  it("breaks ties using the CSPRNG and reports it", () => {
    const voting = new VotingSystem();
    voting.submit({ seatId: "s1", choiceId: "A", submittedAt: 0 });
    voting.submit({ seatId: "s2", choiceId: "B", submittedAt: 0 });
    const tally = voting.tally(["A", "B"], rng);
    expect(["A", "B"]).toContain(tally.winningChoiceId);
    expect(tally.tieBrokenByRng).toBe(true);
  });

  it("still returns a valid winner when nobody voted", () => {
    const voting = new VotingSystem();
    const tally = voting.tally(["A", "B", "C"], rng);
    expect(["A", "B", "C"]).toContain(tally.winningChoiceId);
    expect(tally.tieBrokenByRng).toBe(true);
  });
});
