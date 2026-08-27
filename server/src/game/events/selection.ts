import type { SecureRng } from "../../security/rng.js";
import { EVENT_CATALOG } from "./catalog.js";
import type { EventDefinition } from "./types.js";

/**
 * Picks the next round's event without repeating one already used this
 * match, and honoring per-event round requirements (section 18: every
 * Event carries Requirements). Falls back to any unused event if the
 * round-filtered pool is empty, so a match never stalls for lack of a
 * legal event.
 */
export function pickNextEvent(
  usedEventIds: ReadonlySet<string>,
  round: number,
  rng: SecureRng
): EventDefinition {
  const unused = EVENT_CATALOG.filter((e) => !usedEventIds.has(e.id));
  const pool = unused.length > 0 ? unused : EVENT_CATALOG;
  const eligible = pool.filter((e) => {
    const req = e.requirements;
    if (!req) return true;
    if (req.minRound !== undefined && round < req.minRound) return false;
    if (req.maxRound !== undefined && round > req.maxRound) return false;
    return true;
  });
  const finalPool = eligible.length > 0 ? eligible : pool;
  return rng.pick(finalPool);
}
