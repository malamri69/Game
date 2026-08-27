import { randomInt, randomUUID } from "node:crypto";

/**
 * Cryptographically secure RNG wrapper. All gameplay randomness that affects
 * outcomes (role assignment, resolution ties, event rolls) must go through
 * this module — never Math.random(), and never anything client-influenced.
 */
export class SecureRng {
  /** Integer in [min, max) */
  int(min: number, max: number): number {
    return randomInt(min, max);
  }

  /** Fisher-Yates shuffle using a CSPRNG, does not mutate the input. */
  shuffle<T>(items: readonly T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("SecureRng.pick: empty list");
    return items[this.int(0, items.length)]!;
  }

  seed(): string {
    return randomUUID();
  }
}

export const secureRng = new SecureRng();
