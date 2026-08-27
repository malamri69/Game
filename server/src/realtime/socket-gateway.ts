import type { Server as HTTPServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import { LobbyManager } from "../matchmaking/lobby-manager.js";
import { buildMatchStateForViewer } from "./public-view.js";
import type { ActionRequest } from "../game/actions/types.js";

const TICK_INTERVAL_MS = 1000;
const CHAT_MIN_INTERVAL_MS = 1500; // section 69: minimal spam guard
const CHAT_MAX_LENGTH = 300;

interface SocketData {
  userId: string;
  displayName: string;
  matchCode?: string;
  seatId?: string;
  lastChatAt?: number;
}

/**
 * The one place client sockets touch match state. Every outbound
 * "match:state" is per-socket (buildMatchStateForViewer(manager, seatId)),
 * never a room-wide broadcast of one shared object — that's what keeps a
 * seat's own role and private events from leaking to everyone else in the
 * match (section 32: the client never gets more than it's entitled to).
 *
 * Auth here is a deliberately minimal stand-in (a client-supplied
 * displayName + an optional userId for reconnect) — see docs/TECHNICAL_PLAN.md
 * section 5 (Auth) for the real JWT-based design; wiring that in doesn't
 * change anything below this layer, it only changes how userId gets set.
 */
export function createSocketGateway(httpServer: HTTPServer, lobbyManager: LobbyManager = new LobbyManager()) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const io = new Server<any, any, any, SocketData>(httpServer, {
    cors: { origin: "*" }
  });

  function getSocketMatch(socket: Socket<any, any, any, SocketData>) {
    const code = socket.data.matchCode;
    const seatId = socket.data.seatId;
    if (!code || !seatId) return { manager: undefined, seatId: undefined };
    return { manager: lobbyManager.getMatch(code), seatId };
  }

  function attachToMatch(socket: Socket<any, any, any, SocketData>, code: string, seatId: string, now: number) {
    socket.leave(`lobby:${code}`);
    socket.join(`match:${code}`);
    socket.data.matchCode = code;
    socket.data.seatId = seatId;
    const manager = lobbyManager.getMatch(code);
    if (!manager) return;
    const seat = manager.match.players.find((p) => p.seatId === seatId);
    if (seat) seat.connected = true;
    socket.emit("match:started", { code });
    socket.emit("match:state", buildMatchStateForViewer(manager, seatId, now));
  }

  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    const displayName = String(socket.handshake.auth?.["displayName"] ?? "Player").slice(0, 40);
    const userId = String(socket.handshake.auth?.["userId"] ?? randomUUID());
    socket.data.userId = userId;
    socket.data.displayName = displayName;
    socket.emit("identity", { userId });

    socket.on("matchmaking:quick", () => {
      const lobby = lobbyManager.quickMatch({ userId, displayName });
      socket.join(`lobby:${lobby.code}`);
      socket.emit("lobby:joined", { code: lobby.code });
    });

    socket.on("matchmaking:private:create", () => {
      const lobby = lobbyManager.createPrivateRoom({ userId, displayName });
      socket.join(`lobby:${lobby.code}`);
      socket.emit("lobby:joined", { code: lobby.code });
    });

    socket.on("matchmaking:private:join", (payload: { code?: string }) => {
      const code = String(payload?.code ?? "");
      const lobby = lobbyManager.joinByCode(code, { userId, displayName });
      if (!lobby) {
        socket.emit("match:error", { reason: "unknown_code" });
        return;
      }
      socket.join(`lobby:${lobby.code}`);
      socket.emit("lobby:joined", { code: lobby.code });
    });

    socket.on("match:reconnect", (payload: { code?: string }) => {
      const code = String(payload?.code ?? "").toUpperCase();
      const manager = lobbyManager.getMatch(code);
      if (!manager) {
        socket.emit("match:error", { reason: "unknown_match" });
        return;
      }
      const seat = manager.match.players.find((p) => p.userId === userId);
      if (!seat) {
        socket.emit("match:error", { reason: "not_in_match" });
        return;
      }
      attachToMatch(socket, code, seat.seatId, Date.now());
    });

    socket.on("match:vote", (payload: { choiceId?: string }) => {
      const { manager, seatId } = getSocketMatch(socket);
      if (!manager || !seatId || !payload?.choiceId) return;
      manager.submitVote(seatId, String(payload.choiceId));
    });

    socket.on("match:action", (payload: { actionId?: string; targetSeatId?: string; goldOffer?: number }) => {
      const { manager, seatId } = getSocketMatch(socket);
      if (!manager || !seatId || !payload?.actionId) return;
      const request: ActionRequest = {
        seatId,
        actionId: String(payload.actionId),
        submittedAt: Date.now(),
        ...(payload.targetSeatId ? { targetSeatId: String(payload.targetSeatId) } : {}),
        ...(typeof payload.goldOffer === "number" ? { goldOffer: payload.goldOffer } : {})
      };
      const result = manager.submitAction(request);
      if (!result.ok) socket.emit("match:error", { reason: result.reason });
    });

    socket.on("match:chat", (payload: { text?: string }) => {
      const { manager, seatId } = getSocketMatch(socket);
      if (!manager || !seatId) return;
      const now = Date.now();
      if (socket.data.lastChatAt && now - socket.data.lastChatAt < CHAT_MIN_INTERVAL_MS) return;
      const text = String(payload?.text ?? "").slice(0, CHAT_MAX_LENGTH).trim();
      if (!text) return;
      socket.data.lastChatAt = now;
      io.to(`match:${socket.data.matchCode}`).emit("match:chat", { seatId, text, at: now });
    });

    socket.on("match:rematch", () => {
      const code = socket.data.matchCode;
      if (!code) return;
      lobbyManager.rematch(code);
    });

    socket.on("disconnect", () => {
      const code = socket.data.matchCode;
      const seatId = socket.data.seatId;
      if (!code || !seatId) return;
      const manager = lobbyManager.getMatch(code);
      const seat = manager?.match.players.find((p) => p.seatId === seatId);
      // Section 33: don't remove the seat, just mark it unattended — the
      // AI decision-engine fallback in MatchManager takes over for votes
      // and actions until this same userId reconnects.
      if (seat) seat.connected = false;
    });
  });

  const interval = setInterval(() => {
    const now = Date.now();

    const launched = lobbyManager.launchReadyLobbies(now);
    for (const manager of launched) {
      const code = manager.match.code;
      const roomSockets = io.sockets.adapter.rooms.get(`lobby:${code}`);
      if (!roomSockets) continue;
      for (const socketId of roomSockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) continue;
        const seat = manager.match.players.find((p) => p.userId === socket.data.userId);
        if (!seat) continue;
        attachToMatch(socket, code, seat.seatId, now);
      }
    }

    for (const manager of lobbyManager.allMatches()) {
      manager.tick(now);
      for (const [, socket] of io.sockets.sockets) {
        if (socket.data.matchCode !== manager.match.code || !socket.data.seatId) continue;
        socket.emit("match:state", buildMatchStateForViewer(manager, socket.data.seatId, now));
      }
    }
  }, TICK_INTERVAL_MS);

  return { io, lobbyManager, stop: () => clearInterval(interval) };
}
