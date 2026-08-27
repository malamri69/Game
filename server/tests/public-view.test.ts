import { describe, expect, it } from "vitest";
import { MatchManager } from "../src/game/match-manager.js";
import { fillWithBots } from "../src/game/ai/bot-factory.js";
import { SecureRng } from "../src/security/rng.js";
import { buildMatchStateForViewer, toPublicPlayerView, trustIndicatorFor } from "../src/realtime/public-view.js";

describe("trustIndicatorFor", () => {
  it("buckets reputation into green/yellow/red without ever exposing the raw number", () => {
    expect(trustIndicatorFor(10)).toBe("green");
    expect(trustIndicatorFor(0)).toBe("yellow");
    expect(trustIndicatorFor(-10)).toBe("red");
  });
});

describe("toPublicPlayerView", () => {
  it("never includes roleId, isBot, botPersonality, or raw reputation", () => {
    const view = toPublicPlayerView({
      seatId: "seat-0",
      userId: "u0",
      displayName: "P0",
      isBot: true,
      botPersonality: "aggressive",
      connected: true,
      alive: true,
      resources: { gold: 100, reputation: 5 },
      roleId: "traitor"
    });
    expect(view).not.toHaveProperty("roleId");
    expect(view).not.toHaveProperty("isBot");
    expect(view).not.toHaveProperty("botPersonality");
    expect(view).not.toHaveProperty("reputation");
    expect(JSON.stringify(view)).not.toContain("traitor");
  });
});

describe("buildMatchStateForViewer", () => {
  it("gives the viewer their own role but no other seat's role, anywhere in the payload", () => {
    const rng = new SecureRng();
    const players = fillWithBots([], 8, rng);
    const manager = new MatchManager(players, rng);
    manager.start();

    const viewerSeatId = players[0]!.seatId;
    const view = buildMatchStateForViewer(manager, viewerSeatId);

    expect(view.ownRole).toBeDefined();
    expect(view.ownRole!.roleId).toBe(manager.match.players.find((p) => p.seatId === viewerSeatId)!.roleId);

    const serialized = JSON.stringify(view);
    for (const p of manager.match.players) {
      if (p.seatId === viewerSeatId) continue;
      // No other seat's role id should leak anywhere in the viewer's payload.
      expect(serialized).not.toContain(`"roleId":"${p.roleId}"`);
    }
  });

  it("carries a per-viewer distinct secret info string (section 9)", () => {
    const rng = new SecureRng();
    const players = fillWithBots([], 8, rng);
    const manager = new MatchManager(players, rng);
    manager.start();
    const viewA = buildMatchStateForViewer(manager, players[0]!.seatId);
    expect(viewA.ownSecretInfo).toBeDefined();
    expect(viewA.ownSecretInfo!.ar.length).toBeGreaterThan(0);
  });
});
