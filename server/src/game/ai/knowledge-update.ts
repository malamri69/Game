import type { PublicResolutionEvent } from "../resolution/types.js";
import { adjustRelationship, adjustSuspicion, remember, type AIKnowledge } from "./knowledge.js";

/**
 * Folds a batch of *already-redacted* events (exactly what a real client
 * would receive for this seat, per redactEventForViewer) into a bot's
 * private knowledge. This is the only place bot suspicion/relationship
 * numbers change — it never looks at anything beyond what the seat was
 * legally shown, so a bot can be no better-informed than a human in the
 * same seat (section 5, 29).
 */
export function applyEventsToKnowledge(knowledge: AIKnowledge, events: readonly PublicResolutionEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case "attack_success":
      case "attack_blocked":
        // Actor is hidden by design — all a bot can honestly learn is
        // "something violent happened," which raises general unease.
        for (const seatId of knowledge.suspicion.keys()) {
          adjustSuspicion(knowledge, seatId, 2);
        }
        remember(knowledge, event.round, `violence: ${event.type}`);
        break;

      case "investigate_result":
        if (event.targetSeatId) {
          const readsHostile = /hostile|معادية/.test(`${event.description.ar}${event.description.en}`);
          adjustSuspicion(knowledge, event.targetSeatId, readsHostile ? 60 : -15);
          remember(knowledge, event.round, `investigated ${event.targetSeatId}: ${readsHostile ? "hostile" : "clear"}`);
        }
        break;

      case "spy_result":
        if (event.targetSeatId) {
          adjustSuspicion(knowledge, event.targetSeatId, 5);
        }
        break;

      case "steal_failed":
        if (event.actorSeatId && event.actorSeatId !== knowledge.seatId) {
          adjustSuspicion(knowledge, event.actorSeatId, 25);
          adjustRelationship(knowledge, event.actorSeatId, -30);
          remember(knowledge, event.round, `caught ${event.actorSeatId} stealing from me`);
        }
        break;

      case "trade_success":
      case "bribe_success":
      case "alliance_formed": {
        const other = event.actorSeatId === knowledge.seatId ? event.targetSeatId : event.actorSeatId;
        if (other) {
          adjustRelationship(knowledge, other, 15);
          adjustSuspicion(knowledge, other, -5);
        }
        break;
      }

      case "arrested":
      case "protected":
      case "royal_order_applied":
        // Actor identity withheld by design; nothing safe to attribute.
        break;
    }
  }
  knowledge.round += 1;
}
