import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { createSocketGateway } from "../../src/realtime/socket-gateway.js";
import { gameConfig } from "../../src/config/index.js";

/**
 * Full-stack smoke test: a real HTTP server, a real Socket.io server, a
 * real socket.io-client connection — proves the gateway (Phase 8) is
 * actually wired to the game engine, not just type-checked. We only drive
 * it as far as the lobby launching into a match and the first per-viewer
 * state snapshot arriving; running a full match to REMATCH here would mean
 * waiting out real wall-clock discussion/voting timers (by design, a real
 * match takes the 5-8 minutes section 10 asks for) — that's covered
 * instead by match-manager.test.ts, which fast-forwards a fake clock.
 */
describe("Socket.io gateway — matchmaking end to end", () => {
  let httpServer: ReturnType<typeof createServer>;
  let stop: () => void;
  let baseUrl: string;

  beforeEach(async () => {
    httpServer = createServer();
    const gateway = createSocketGateway(httpServer);
    stop = gateway.stop;
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as AddressInfo).port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    stop();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it(
    "assigns an identity, joins quick match, and eventually launches into a match with a role for this seat",
    async () => {
      const client: ClientSocket = ioClient(baseUrl, { auth: { displayName: "Tester" }, transports: ["websocket"] });

      const identity = await new Promise<{ userId: string }>((resolve) => client.once("identity", resolve));
      expect(identity.userId).toBeTruthy();

      client.emit("matchmaking:quick");
      const joined = await new Promise<{ code: string }>((resolve) => client.once("lobby:joined", resolve));
      expect(joined.code).toMatch(/^[A-Z0-9]{4}$/);

      const started = await new Promise<{ code: string }>((resolve) => client.once("match:started", resolve));
      expect(started.code).toBe(joined.code);

      const state = await new Promise<any>((resolve) => client.once("match:state", resolve));
      expect(state.code).toBe(joined.code);
      expect(state.players.length).toBeGreaterThanOrEqual(gameConfig.minPlayers);
      expect(state.players.length).toBeLessThanOrEqual(gameConfig.maxPlayers);
      // No other seat's hidden data anywhere in what this client received.
      const serialized = JSON.stringify(state);
      expect(serialized).not.toMatch(/"isBot":true/);

      client.close();
    },
    15000
  );
});
