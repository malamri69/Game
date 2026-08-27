import { describe, expect, it } from "vitest";
import { simulateMatches } from "../src/simulation/simulator.js";

describe("simulateMatches", () => {
  it("completes every match and gives every MVP role at least some appearances over enough matches", () => {
    const summary = simulateMatches(60, 8);
    expect(summary.matches).toBe(60);
    for (const roleId of ["king", "traitor", "investigator", "guardian", "merchant", "spy", "commander", "citizen"]) {
      expect(summary.appearancesByRole[roleId]).toBeGreaterThan(0);
      expect(summary.winRateByRole[roleId]).toBeGreaterThanOrEqual(0);
      expect(summary.winRateByRole[roleId]).toBeLessThanOrEqual(1);
    }
  });

  it("keeps average round count within the configured 3-4 range", () => {
    const summary = simulateMatches(40, 8);
    expect(summary.averageRounds).toBeGreaterThanOrEqual(3);
    expect(summary.averageRounds).toBeLessThanOrEqual(4);
  });
});
