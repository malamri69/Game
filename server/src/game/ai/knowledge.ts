import type { BotPersonality } from "../types.js";

export interface AIMemoryEntry {
  round: number;
  /** Short internal note — never shown to any player, purely for the bot's own reasoning. */
  note: string;
}

/**
 * Everything one bot privately believes (section 29): known facts,
 * suspicions, beliefs, goals, relationships, memory, current strategy,
 * risk level. Populated only from information the server would legally
 * reveal to that seat — see resolution/types.ts#redactEventForViewer,
 * which is the only path events reach this model through.
 */
export interface AIKnowledge {
  seatId: string;
  personality: BotPersonality;
  roleId: string;
  /** seatId -> suspicion, 0 (trusted) .. 100 (certain threat). Private belief, never shown to players. */
  suspicion: Map<string, number>;
  /** seatId -> trust, -100 (enemy) .. 100 (close ally). */
  relationships: Map<string, number>;
  memory: AIMemoryEntry[];
  /** Guardian continuity: a role rule says it can't protect the same seat twice running. */
  lastProtectedSeatId?: string;
  round: number;
}

const BASELINE_SUSPICION = 20;

export function createAIKnowledge(
  seatId: string,
  personality: BotPersonality,
  roleId: string,
  allSeatIds: readonly string[]
): AIKnowledge {
  const suspicion = new Map<string, number>();
  const relationships = new Map<string, number>();
  for (const other of allSeatIds) {
    if (other === seatId) continue;
    suspicion.set(other, BASELINE_SUSPICION);
    relationships.set(other, 0);
  }
  return { seatId, personality, roleId, suspicion, relationships, memory: [], round: 0 };
}

export function adjustSuspicion(knowledge: AIKnowledge, seatId: string, delta: number): void {
  const current = knowledge.suspicion.get(seatId) ?? BASELINE_SUSPICION;
  knowledge.suspicion.set(seatId, Math.max(0, Math.min(100, current + delta)));
}

export function adjustRelationship(knowledge: AIKnowledge, seatId: string, delta: number): void {
  const current = knowledge.relationships.get(seatId) ?? 0;
  knowledge.relationships.set(seatId, Math.max(-100, Math.min(100, current + delta)));
}

export function remember(knowledge: AIKnowledge, round: number, note: string): void {
  knowledge.memory.push({ round, note });
}
