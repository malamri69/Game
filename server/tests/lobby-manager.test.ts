import { describe, expect, it } from "vitest";
import { LobbyManager } from "../src/matchmaking/lobby-manager.js";
import { SecureRng } from "../src/security/rng.js";
import { gameConfig } from "../src/config/index.js";

describe("LobbyManager — quick match", () => {
  it("does not launch until the bot-backfill wait elapses (never make a player wait long, but not instantly either)", () => {
    const manager = new LobbyManager(new SecureRng());
    const now = 1_000_000;
    manager.quickMatch({ userId: "u1", displayName: "A" }, now);
    const launched = manager.launchReadyLobbies(now + 10);
    expect(launched).toHaveLength(0);
  });

  it("launches with bots filling the rest once the backfill wait elapses", () => {
    const manager = new LobbyManager(new SecureRng());
    const now = 1_000_000;
    manager.quickMatch({ userId: "u1", displayName: "A" }, now);
    const launched = manager.launchReadyLobbies(now + gameConfig.botBackfillWaitMs + 1);
    expect(launched).toHaveLength(1);
    expect(launched[0]!.match.players.length).toBeGreaterThanOrEqual(gameConfig.minPlayers);
    expect(launched[0]!.match.players.some((p) => p.userId === "u1")).toBe(true);
    expect(launched[0]!.match.players.some((p) => p.isBot)).toBe(true);
  });

  it("launches immediately once maxPlayers humans have joined", () => {
    const manager = new LobbyManager(new SecureRng());
    const now = 1_000_000;
    let lobby;
    for (let i = 0; i < gameConfig.maxPlayers; i++) {
      lobby = manager.quickMatch({ userId: `u${i}`, displayName: `P${i}` }, now);
    }
    expect(lobby!.isFull()).toBe(true);
    const launched = manager.launchReadyLobbies(now + 1);
    expect(launched).toHaveLength(1);
    expect(launched[0]!.match.players).toHaveLength(gameConfig.maxPlayers);
  });
});

describe("LobbyManager — private rooms", () => {
  it("lets a second player join by the room's code", () => {
    const manager = new LobbyManager(new SecureRng());
    const now = 1_000_000;
    const room = manager.createPrivateRoom({ userId: "host", displayName: "Host" }, now);
    const joined = manager.joinByCode(room.code, { userId: "guest", displayName: "Guest" });
    expect(joined).not.toBeNull();
    expect(joined!.seatCount).toBe(2);
  });

  it("returns null for an unknown room code", () => {
    const manager = new LobbyManager(new SecureRng());
    expect(manager.joinByCode("ZZZZ", { userId: "u1", displayName: "A" })).toBeNull();
  });

  it("keeps the match reachable under the same code players joined with", () => {
    const manager = new LobbyManager(new SecureRng());
    const now = 1_000_000;
    const room = manager.createPrivateRoom({ userId: "host", displayName: "Host" }, now);
    const launched = manager.launchReadyLobbies(now + gameConfig.botBackfillWaitMs + 1);
    expect(launched).toHaveLength(1);
    expect(manager.getMatch(room.code)).toBe(launched[0]);
  });
});

describe("LobbyManager — rematch", () => {
  it("carries the human roster into a fresh match under the same code (section 35)", () => {
    const manager = new LobbyManager(new SecureRng());
    const now = 1_000_000;
    const room = manager.createPrivateRoom({ userId: "host", displayName: "Host" }, now);
    manager.launchReadyLobbies(now + gameConfig.botBackfillWaitMs + 1);

    const rematched = manager.rematch(room.code, now + 999_999);
    expect(rematched).not.toBeNull();
    expect(rematched!.match.code).toBe(room.code);
    expect(rematched!.match.players.some((p) => p.userId === "host")).toBe(true);
    expect(manager.getMatch(room.code)).toBe(rematched);
  });

  it("returns null for a code with no prior match", () => {
    const manager = new LobbyManager(new SecureRng());
    expect(manager.rematch("ZZZZ")).toBeNull();
  });
});
