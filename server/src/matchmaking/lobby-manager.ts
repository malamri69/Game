import { secureRng as defaultRng, type SecureRng } from "../security/rng.js";
import { gameConfig } from "../config/index.js";
import { MatchManager } from "../game/match-manager.js";
import { fillWithBots } from "../game/ai/bot-factory.js";
import type { Player } from "../game/types.js";

export interface LobbySeat {
  userId: string;
  displayName: string;
}

/**
 * One pending lobby, not yet a running match. Private rooms wait for
 * their host to start (or fill with bots once minPlayers is met and the
 * host is ready); quick match just waits for either maxPlayers or the
 * bot-backfill timeout, whichever comes first (section 4: never make a
 * player wait long — fill the rest with bots).
 */
export class Lobby {
  readonly code: string;
  readonly isPrivate: boolean;
  readonly createdAt: number;
  private seats: LobbySeat[] = [];

  constructor(code: string, isPrivate: boolean, now: number = Date.now()) {
    this.code = code;
    this.isPrivate = isPrivate;
    this.createdAt = now;
  }

  addSeat(seat: LobbySeat): boolean {
    if (this.seats.length >= gameConfig.maxPlayers) return false;
    if (this.seats.some((s) => s.userId === seat.userId)) return true;
    this.seats.push(seat);
    return true;
  }

  removeSeat(userId: string): void {
    this.seats = this.seats.filter((s) => s.userId !== userId);
  }

  get seatCount(): number {
    return this.seats.length;
  }

  get humanSeats(): readonly LobbySeat[] {
    return this.seats;
  }

  isFull(): boolean {
    return this.seats.length >= gameConfig.maxPlayers;
  }

  /** Ready to launch once the backfill wait has elapsed and there are
   * enough seats (human + about-to-be-added bots) to hit minPlayers. */
  readyToLaunch(now: number): boolean {
    if (this.seats.length === 0) return false;
    if (this.isFull()) return true;
    return now - this.createdAt >= gameConfig.botBackfillWaitMs;
  }

  toPlayers(rng: SecureRng): Player[] {
    const humanPlayers: Player[] = this.seats.map((seat, i) => ({
      seatId: `seat-${i}`,
      userId: seat.userId,
      displayName: seat.displayName,
      isBot: false,
      connected: true,
      alive: true,
      resources: { gold: gameConfig.economy.startingGold, reputation: 0 }
    }));
    const targetCount = Math.max(gameConfig.minPlayers, Math.min(gameConfig.maxPlayers, humanPlayers.length || gameConfig.defaultPlayers));
    return fillWithBots(humanPlayers, targetCount, rng);
  }
}

/**
 * Owns all pending lobbies and all in-flight matches in this process
 * (section 34: Quick Match, Private Room, Join by Code). Everything here
 * is in-memory per section 2 of the tech plan — a Redis-backed store is a
 * drop-in swap behind the same interface once we shard across processes.
 */
export class LobbyManager {
  private readonly lobbiesByCode = new Map<string, Lobby>();
  private readonly matchesByCode = new Map<string, MatchManager>();
  private quickMatchLobby: Lobby | null = null;

  constructor(private readonly rng: SecureRng = defaultRng) {}

  private generateUniqueCode(): string {
    let code: string;
    do {
      code = this.rng.pick("ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split("")) + this.generateCodeTail();
    } while (this.lobbiesByCode.has(code) || this.matchesByCode.has(code));
    return code;
  }

  private generateCodeTail(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let tail = "";
    for (let i = 0; i < 3; i++) tail += this.rng.pick(alphabet.split(""));
    return tail;
  }

  quickMatch(seat: LobbySeat, now: number = Date.now()): Lobby {
    if (!this.quickMatchLobby || this.quickMatchLobby.isFull()) {
      this.quickMatchLobby = new Lobby(this.generateUniqueCode(), false, now);
      this.lobbiesByCode.set(this.quickMatchLobby.code, this.quickMatchLobby);
    }
    this.quickMatchLobby.addSeat(seat);
    return this.quickMatchLobby;
  }

  createPrivateRoom(host: LobbySeat, now: number = Date.now()): Lobby {
    const lobby = new Lobby(this.generateUniqueCode(), true, now);
    lobby.addSeat(host);
    this.lobbiesByCode.set(lobby.code, lobby);
    return lobby;
  }

  joinByCode(code: string, seat: LobbySeat): Lobby | null {
    const lobby = this.lobbiesByCode.get(code.toUpperCase());
    if (!lobby) return null;
    lobby.addSeat(seat);
    return lobby;
  }

  getLobby(code: string): Lobby | undefined {
    return this.lobbiesByCode.get(code.toUpperCase());
  }

  getMatch(code: string): MatchManager | undefined {
    return this.matchesByCode.get(code.toUpperCase());
  }

  allMatches(): MatchManager[] {
    return [...this.matchesByCode.values()];
  }

  /** Launches every lobby that's ready (private room explicitly started,
   * or the backfill wait elapsed), turning it into a running match. */
  launchReadyLobbies(now: number = Date.now()): MatchManager[] {
    const launched: MatchManager[] = [];
    for (const [code, lobby] of this.lobbiesByCode) {
      if (!lobby.readyToLaunch(now)) continue;
      const players = lobby.toPlayers(this.rng);
      const manager = new MatchManager(players, this.rng);
      manager.match.code = code; // keep the code players already joined with (section 34)
      manager.start(now);
      this.matchesByCode.set(code, manager);
      this.lobbiesByCode.delete(code);
      if (this.quickMatchLobby === lobby) this.quickMatchLobby = null;
      launched.push(manager);
    }
    return launched;
  }

  /** Section 35: rematch reuses the same human roster, fresh bots and
   * fresh roles, without dumping anyone back to the home screen. */
  rematch(code: string, now: number = Date.now()): MatchManager | null {
    const previous = this.matchesByCode.get(code.toUpperCase());
    if (!previous) return null;
    const humanPlayers: LobbySeat[] = previous.match.players
      .filter((p) => !p.isBot)
      .map((p) => ({ userId: p.userId, displayName: p.displayName }));
    const lobby = new Lobby(previous.match.code, false, now);
    for (const seat of humanPlayers) lobby.addSeat(seat);
    const players = lobby.toPlayers(this.rng);
    const manager = new MatchManager(players, this.rng);
    manager.match.code = previous.match.code;
    manager.start(now);
    this.matchesByCode.set(previous.match.code, manager);
    return manager;
  }

  removeMatch(code: string): void {
    this.matchesByCode.delete(code.toUpperCase());
  }
}
