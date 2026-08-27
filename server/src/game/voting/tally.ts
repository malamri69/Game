import type { SecureRng } from "../../security/rng.js";
import type { VoteSubmission, VoteTally } from "./types.js";

/**
 * Server-authoritative vote collection + tally (section 25). One vote per
 * seat, latest submission wins if a player changes their mind before the
 * timer expires. Ties are broken by the CSPRNG, never by submission order
 * (submission order would leak information about who voted first).
 */
export class VotingSystem {
  private votesBySeat = new Map<string, VoteSubmission>();

  submit(vote: VoteSubmission): void {
    this.votesBySeat.set(vote.seatId, vote);
  }

  clear(): void {
    this.votesBySeat.clear();
  }

  size(): number {
    return this.votesBySeat.size;
  }

  tally(validChoiceIds: readonly string[], rng: SecureRng): VoteTally {
    const counts: Record<string, number> = Object.fromEntries(validChoiceIds.map((id) => [id, 0]));
    for (const vote of this.votesBySeat.values()) {
      if (vote.choiceId in counts) counts[vote.choiceId] = (counts[vote.choiceId] ?? 0) + 1;
    }
    const maxCount = Math.max(0, ...Object.values(counts));
    const winners = Object.entries(counts)
      .filter(([, count]) => count === maxCount)
      .map(([id]) => id);

    if (winners.length === 1 && maxCount > 0) {
      return { winningChoiceId: winners[0]!, counts, tieBrokenByRng: false };
    }
    const pool = winners.length > 0 ? winners : validChoiceIds;
    return { winningChoiceId: rng.pick(pool), counts, tieBrokenByRng: true };
  }
}
