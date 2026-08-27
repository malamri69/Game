import { secureRng as defaultRng, type SecureRng } from "../security/rng.js";
import { gameConfig } from "../config/index.js";
import { MatchStateMachine } from "./state-machine/machine.js";
import type { Match, MatchStateName, MatchTimers, Player } from "./types.js";
import { assignRoles, generateSecretInfo, type SecretInfo } from "./roles/assignment.js";
import { getRole } from "./roles/catalog.js";
import { buildMatchEndContext } from "./roles/win-context.js";
import { pickNextEvent } from "./events/selection.js";
import type { EventDefinition } from "./events/types.js";
import { ActionQueue, validateAction } from "./actions/validation.js";
import type { ActionRequest } from "./actions/types.js";
import { VotingSystem } from "./voting/tally.js";
import type { VoteTally } from "./voting/types.js";
import { ResolutionEngine } from "./resolution/engine.js";
import { createResolutionContext, redactEventForViewer, type ResolutionContext, type ResolutionEvent } from "./resolution/types.js";
import { createAIKnowledge, type AIKnowledge } from "./ai/knowledge.js";
import { applyEventsToKnowledge } from "./ai/knowledge-update.js";
import { AIDecisionEngine } from "./ai/decision-engine.js";

const INSTANT_STATES = new Set<MatchStateName>(["LOBBY", "MATCHMAKING", "ROLE_ASSIGNMENT", "ROUND_START", "NEXT_ROUND"]);
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0, I/1 — section 34's "K7P9" style

export function generateRoomCode(rng: SecureRng, length = 4): string {
  let code = "";
  for (let i = 0; i < length; i++) code += ROOM_CODE_ALPHABET[rng.int(0, ROOM_CODE_ALPHABET.length)];
  return code;
}

export interface MatchResult {
  winnerSeatIds: string[];
  timeline: ResolutionEvent[];
}

/**
 * Owns one match end-to-end: wires the state machine to role assignment,
 * event selection, action validation, voting, the resolution engine, and
 * bot decision-making. Framework-agnostic — no Socket.io/Express in here,
 * so it can run headless (the Phase 12 balance simulator drives thousands
 * of matches through exactly this class) or behind a realtime gateway
 * (Phase 8) with identical behavior.
 */
export class MatchManager {
  readonly match: Match;
  readonly stateMachine: MatchStateMachine;
  readonly timers: MatchTimers = gameConfig.timers;

  private readonly rng: SecureRng;
  private readonly resolutionEngine: ResolutionEngine;
  private readonly aiEngine: AIDecisionEngine;
  private readonly actionQueue = new ActionQueue();
  private readonly votingSystem = new VotingSystem();
  private readonly usedEventIds = new Set<string>();
  private readonly aiKnowledgeBySeat = new Map<string, AIKnowledge>();
  private readonly secretInfoBySeat = new Map<string, SecretInfo>();
  private readonly timeline: ResolutionEvent[] = [];

  private resolutionContext!: ResolutionContext;
  private currentEvent: EventDefinition | null = null;
  private lastVoteTally: VoteTally | null = null;
  private result: MatchResult | null = null;

  constructor(players: Player[], rng: SecureRng = defaultRng) {
    const totalRounds = rng.int(gameConfig.rounds.min, gameConfig.rounds.max + 1);
    this.rng = rng;
    this.match = {
      id: rng.seed(),
      code: generateRoomCode(rng),
      state: "LOBBY",
      stateEnteredAt: Date.now(),
      round: 1,
      totalRounds,
      players,
      rngSeed: rng.seed(),
      createdAt: Date.now()
    };
    this.stateMachine = new MatchStateMachine(this.match);
    this.resolutionEngine = new ResolutionEngine(rng);
    this.aiEngine = new AIDecisionEngine(rng);
  }

  private get playersBySeat(): Map<string, Player> {
    return new Map(this.match.players.map((p) => [p.seatId, p]));
  }

  private get alivePlayers(): Player[] {
    return this.match.players.filter((p) => p.alive);
  }

  getSecretInfo(seatId: string): SecretInfo | undefined {
    return this.secretInfoBySeat.get(seatId);
  }

  getCurrentEvent(): EventDefinition | null {
    return this.currentEvent;
  }

  getResult(): MatchResult | null {
    return this.result;
  }

  /** What a client for this seat is allowed to know about this round's events so far. */
  eventsForViewer(round: number, seatId: string) {
    return this.timeline
      .filter((e) => e.round === round)
      .map((e) => redactEventForViewer(e, seatId))
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }

  /** Starts the match and runs it forward through every instant state and
   * every already-expired timer, per section 10/68: purely server-clock
   * driven, never dependent on a client telling it "go". */
  start(now: number = Date.now()): void {
    this.tick(now);
  }

  submitVote(seatId: string, choiceId: string, now: number = Date.now()): void {
    if (this.stateMachine.current !== "VOTING" && this.stateMachine.current !== "FINAL_DECISION") return;
    this.votingSystem.submit({ seatId, choiceId, submittedAt: now });
  }

  submitAction(request: ActionRequest): { ok: boolean; reason?: string } {
    if (this.stateMachine.current !== "SECRET_ACTIONS") return { ok: false, reason: "wrong_phase" };
    const actor = this.playersBySeat.get(request.seatId);
    if (!actor) return { ok: false, reason: "unknown_actor" };
    const result = validateAction(request, actor, this.playersBySeat);
    if (!result.ok) return result;
    this.actionQueue.submit(request);
    return { ok: true };
  }

  /** Advances past every instant state and every state whose timer has
   * expired by `now`. Call this frequently (e.g. every second) from
   * whatever owns the wall clock — a Socket.io interval in Phase 8, or a
   * simulation loop that just jumps `now` forward round by round. */
  tick(now: number = Date.now()): void {
    if (this.stateMachine.current === "REMATCH") return;
    // Safety bound: a match has a small, fixed number of states, so this
    // can never legitimately loop more than a few dozen times per tick.
    for (let guard = 0; guard < 200; guard++) {
      const current = this.stateMachine.current;
      const shouldAdvance = INSTANT_STATES.has(current) || this.stateMachine.isExpired(this.timers, now);
      if (!shouldAdvance) return;
      const next = this.stateMachine.advance(now);
      this.onEnter(next, now);
      if (next === "REMATCH") return;
    }
  }

  private onEnter(state: MatchStateName, now: number): void {
    switch (state) {
      case "ROLE_ASSIGNMENT": {
        assignRoles(this.match.players, this.rng);
        const info = generateSecretInfo(this.match.players, this.rng);
        for (const [seatId, secret] of info) this.secretInfoBySeat.set(seatId, secret);

        const king = this.match.players.find((p) => p.roleId === "king");
        if (!king) throw new Error("MatchManager: role assignment did not produce a King");
        this.resolutionContext = createResolutionContext(king.seatId);

        const allSeatIds = this.match.players.map((p) => p.seatId);
        for (const p of this.match.players) {
          if (p.isBot && p.botPersonality && p.roleId) {
            this.aiKnowledgeBySeat.set(p.seatId, createAIKnowledge(p.seatId, p.botPersonality, p.roleId, allSeatIds));
          }
        }
        break;
      }

      case "ROUND_START":
        this.actionQueue.clear();
        this.votingSystem.clear();
        break;

      case "EVENT":
      case "FINAL_EVENT": {
        const event = pickNextEvent(this.usedEventIds, this.match.round, this.rng);
        this.usedEventIds.add(event.id);
        this.currentEvent = event;
        break;
      }

      case "VOTING":
        this.submitBotVotes();
        break;

      case "SECRET_ACTIONS":
        this.submitBotActions();
        break;

      case "RESOLUTION":
        this.resolveRound();
        break;

      case "FINAL_DECISION":
        this.submitBotVotes();
        break;

      case "REVEAL":
        this.applyFinalVoteAndResolveWinners();
        break;

      default:
        break;
    }
  }

  private submitBotVotes(): void {
    if (!this.currentEvent) return;
    const choiceIds = this.currentEvent.choices.map((c) => c.id);
    for (const p of this.alivePlayers) {
      if (!p.isBot) continue;
      this.votingSystem.submit({ seatId: p.seatId, choiceId: this.aiEngine.decideVote(choiceIds), submittedAt: Date.now() });
    }
  }

  private submitBotActions(): void {
    const alive = this.alivePlayers;
    for (const p of alive) {
      if (!p.isBot || !p.roleId) continue;
      const knowledge = this.aiKnowledgeBySeat.get(p.seatId);
      if (!knowledge) continue;
      const request = this.aiEngine.decideAction(knowledge, p, alive);
      if (!request) continue;
      const validation = validateAction(request, p, this.playersBySeat);
      if (validation.ok) this.actionQueue.submit(request);
    }
  }

  private resolveRound(): void {
    if (!this.currentEvent) return;
    const round = this.match.round;
    const tally = this.votingSystem.tally(
      this.currentEvent.choices.map((c) => c.id),
      this.rng
    );
    this.lastVoteTally = tally;
    const chosen = this.currentEvent.choices.find((c) => c.id === tally.winningChoiceId);
    const kingdomEvents: ResolutionEvent[] = [];
    if (chosen) {
      const king = this.match.players.find((p) => p.roleId === "king");
      for (const effect of chosen.effects) {
        const targets =
          effect.scope === "kingdom"
            ? this.match.players
            : effect.scope === "king" && king
              ? [king]
              : effect.scope === "self"
                ? []
                : [];
        for (const target of targets) {
          if (effect.goldDelta) target.resources.gold = Math.max(0, target.resources.gold + effect.goldDelta);
          if (effect.reputationDelta) target.resources.reputation += effect.reputationDelta;
        }
        kingdomEvents.push({
          round,
          type: "royal_order_applied",
          actorSeatId: "kingdom",
          visibleTo: "all",
          description: effect.description
        });
      }
    }

    const actionEvents = this.resolutionEngine.resolve(round, this.actionQueue.all(), this.playersBySeat, this.resolutionContext);
    const allEvents = [...kingdomEvents, ...actionEvents];
    this.timeline.push(...allEvents);

    for (const [seatId, knowledge] of this.aiKnowledgeBySeat) {
      const redacted = allEvents.map((e) => redactEventForViewer(e, seatId)).filter((e): e is NonNullable<typeof e> => e !== null);
      applyEventsToKnowledge(knowledge, redacted);
    }
  }

  private applyFinalVoteAndResolveWinners(): void {
    if (this.currentEvent) {
      const tally = this.votingSystem.tally(
        this.currentEvent.choices.map((c) => c.id),
        this.rng
      );
      this.lastVoteTally = tally;
      const chosen = this.currentEvent.choices.find((c) => c.id === tally.winningChoiceId);
      if (chosen) {
        for (const effect of chosen.effects) {
          if (effect.scope !== "kingdom") continue;
          for (const p of this.match.players) {
            if (effect.goldDelta) p.resources.gold = Math.max(0, p.resources.gold + effect.goldDelta);
            if (effect.reputationDelta) p.resources.reputation += effect.reputationDelta;
          }
        }
      }
    }

    const matchEndContext = buildMatchEndContext(this.match.players, this.resolutionContext);
    const winnerSeatIds = this.match.players
      .filter((p) => p.roleId && getRole(p.roleId).evaluateWin(matchEndContext, p.seatId))
      .map((p) => p.seatId);

    this.result = { winnerSeatIds, timeline: this.timeline };
  }
}
