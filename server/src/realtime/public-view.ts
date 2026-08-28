import type { MatchManager } from "../game/match-manager.js";
import type { MatchStateName, Player } from "../game/types.js";
import { ownRoleView, type PublicRoleView, type SecretInfo } from "../game/roles/assignment.js";
import type { LocalizedText } from "../game/roles/types.js";
import type { PublicResolutionEvent } from "../game/resolution/types.js";

export type TrustIndicator = "green" | "yellow" | "red";

/** Section 27: never show the raw reputation number, only a coarse
 * trust indicator, and it has to come from real gameplay signal
 * (accumulated reputation deltas from betrayal/bribery/etc.), not chance. */
export function trustIndicatorFor(reputation: number): TrustIndicator {
  if (reputation >= 3) return "green";
  if (reputation <= -3) return "red";
  return "yellow";
}

export interface PublicPlayerView {
  seatId: string;
  displayName: string;
  connected: boolean;
  alive: boolean;
  gold: number;
  trustIndicator: TrustIndicator;
}

/** What every client is allowed to know about any seat, including their
 * own — role, isBot, botPersonality, and reputation never appear here
 * (sections 5, 8, 26, 27, 32). */
export function toPublicPlayerView(player: Player): PublicPlayerView {
  return {
    seatId: player.seatId,
    displayName: player.displayName,
    connected: player.connected,
    alive: player.alive,
    gold: player.resources.gold,
    trustIndicator: trustIndicatorFor(player.resources.reputation)
  };
}

export interface PublicEventChoice {
  id: string;
  label: LocalizedText;
}

export interface PublicEvent {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  choices: PublicEventChoice[];
}

export interface MatchStateForViewer {
  code: string;
  state: MatchStateName;
  round: number;
  totalRounds: number;
  remainingMs: number | null;
  /** Which entry in `players` is this viewer's own seat — a client has no
   * other way to tell (section 32: everything else in this payload is
   * symmetric across viewers). */
  viewerSeatId: string;
  players: PublicPlayerView[];
  /** Present only once role assignment has run, and only for the viewer's own seat. */
  ownRole?: PublicRoleView;
  ownSecretInfo?: SecretInfo;
  currentEvent?: PublicEvent;
  /** This round's events, already redacted per-viewer via redactEventForViewer. */
  events: PublicResolutionEvent[];
  result?: { winnerSeatIds: string[]; youWon: boolean };
}

/** The single place a client-facing snapshot gets assembled — every field
 * here has already been through the redaction that keeps hidden roles and
 * hidden actors hidden. Nothing upstream of this function should ever be
 * handed to a socket directly. */
export function buildMatchStateForViewer(manager: MatchManager, seatId: string, now: number = Date.now()): MatchStateForViewer {
  const match = manager.match;
  const viewer = match.players.find((p) => p.seatId === seatId);
  const event = manager.getCurrentEvent();
  const result = manager.getResult();

  return {
    code: match.code,
    state: match.state,
    round: match.round,
    totalRounds: match.totalRounds,
    remainingMs: manager.stateMachine.remainingMs(manager.timers, now),
    viewerSeatId: seatId,
    players: match.players.map(toPublicPlayerView),
    ownRole: viewer?.roleId ? ownRoleView(viewer) : undefined,
    ownSecretInfo: manager.getSecretInfo(seatId),
    currentEvent: event
      ? { id: event.id, name: event.name, description: event.description, choices: event.choices.map((c) => ({ id: c.id, label: c.label })) }
      : undefined,
    events: manager.eventsForViewer(match.round, seatId),
    result: result ? { winnerSeatIds: result.winnerSeatIds, youWon: result.winnerSeatIds.includes(seatId) } : undefined
  };
}
