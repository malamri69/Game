import type { Match, MatchStateName, MatchTimers } from "../types.js";

/**
 * Linear flow per section 11, with NEXT_ROUND looping back to ROUND_START
 * until the configured round count is reached, then branching into the
 * final-round sequence. This table is the single source of truth for legal
 * transitions — nothing else in the codebase should hardcode "what comes next".
 */
const LOOPING_FLOW: MatchStateName[] = [
  "LOBBY",
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

const FINAL_TAIL: MatchStateName[] = [
  "FINAL_EVENT",
  "FINAL_DECISION",
  "REVEAL",
  "REWARDS",
  "REMATCH"
];

export function durationForState(state: MatchStateName, timers: MatchTimers): number | null {
  switch (state) {
    case "ROLE_REVEAL":
      return timers.roleRevealMs;
    case "EVENT":
    case "FINAL_EVENT":
      return timers.eventMs;
    case "DISCUSSION":
      return timers.discussionMs;
    case "VOTING":
      return timers.votingMs;
    case "SECRET_ACTIONS":
      return timers.secretActionMs;
    case "RESOLUTION":
    case "CONSEQUENCES":
      return timers.resolutionMs;
    case "FINAL_DECISION":
      return timers.finalDecisionMs;
    case "REVEAL":
      return timers.revealMs;
    case "REWARDS":
      return timers.rewardsMs;
    default:
      // LOBBY, MATCHMAKING, ROLE_ASSIGNMENT, ROUND_START, NEXT_ROUND, REMATCH
      // are event-driven or instantaneous, not timer-driven.
      return null;
  }
}

export type StateChangeListener = (match: Match, from: MatchStateName, to: MatchStateName) => void;

/**
 * Server-authoritative state machine for a single match. All timing is
 * measured against Date.now() on the server (section 10/68: never trust the
 * client clock) via stateEnteredAt + durationForState.
 */
export class MatchStateMachine {
  private listeners: StateChangeListener[] = [];

  constructor(private readonly match: Match) {}

  onChange(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }

  get current(): MatchStateName {
    return this.match.state;
  }

  /** Milliseconds remaining in the current state, or null if it's not timer-bound. */
  remainingMs(timers: MatchTimers, now: number = Date.now()): number | null {
    const duration = durationForState(this.match.state, timers);
    if (duration === null) return null;
    return Math.max(0, this.match.stateEnteredAt + duration - now);
  }

  /** Whether the current state's timer has expired and it's safe to advance. */
  isExpired(timers: MatchTimers, now: number = Date.now()): boolean {
    const remaining = this.remainingMs(timers, now);
    return remaining !== null && remaining <= 0;
  }

  /** Advance to the next state in the flow. Throws on an illegal call from a terminal state. */
  advance(now: number = Date.now()): MatchStateName {
    const from = this.match.state;
    const next = this.computeNext(from);
    this.match.state = next;
    this.match.stateEnteredAt = now;
    for (const listener of this.listeners) listener(this.match, from, next);
    return next;
  }

  private computeNext(from: MatchStateName): MatchStateName {
    if (from === "NEXT_ROUND") {
      const roundsCompleted = this.match.round;
      if (roundsCompleted >= this.match.totalRounds) {
        return "FINAL_EVENT";
      }
      this.match.round += 1;
      return "ROUND_START";
    }

    const loopIndex = LOOPING_FLOW.indexOf(from);
    if (loopIndex >= 0 && loopIndex < LOOPING_FLOW.length - 1) {
      return LOOPING_FLOW[loopIndex + 1]!;
    }

    const tailIndex = FINAL_TAIL.indexOf(from);
    if (tailIndex >= 0) {
      if (tailIndex === FINAL_TAIL.length - 1) {
        throw new Error(`MatchStateMachine: cannot advance past terminal state "${from}"`);
      }
      return FINAL_TAIL[tailIndex + 1]!;
    }

    throw new Error(`MatchStateMachine: unknown state "${from}"`);
  }
}

export function createInitialMatchState(): { state: MatchStateName; round: number } {
  return { state: "LOBBY", round: 1 };
}
