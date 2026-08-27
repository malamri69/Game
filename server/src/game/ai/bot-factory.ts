import type { SecureRng } from "../../security/rng.js";
import type { BotPersonality, Player } from "../types.js";
import { gameConfig } from "../../config/index.js";

const PERSONALITIES: BotPersonality[] = ["politician", "aggressive", "deceiver", "coward", "opportunist", "analyst"];

const BOT_DISPLAY_NAMES = [
  "سالم", "نورة", "فيصل", "عبير", "خالد", "لمى", "ماجد", "ريم", "تركي", "هند"
];

/** Fills empty seats with bots (section 4/33) that are indistinguishable
 * from human seats at the type level — same Player shape, same validation
 * path, same resolution engine. Only isBot + botPersonality mark them. */
export function createBotPlayer(seatId: string, rng: SecureRng): Player {
  return {
    seatId,
    userId: `bot-${seatId}`,
    displayName: rng.pick(BOT_DISPLAY_NAMES),
    isBot: true,
    botPersonality: rng.pick(PERSONALITIES),
    connected: true,
    alive: true,
    resources: { gold: gameConfig.economy.startingGold, reputation: 0 }
  };
}

export function fillWithBots(existingPlayers: Player[], targetCount: number, rng: SecureRng): Player[] {
  const bots: Player[] = [];
  let seatIndex = existingPlayers.length;
  while (existingPlayers.length + bots.length < targetCount) {
    bots.push(createBotPlayer(`seat-${seatIndex}`, rng));
    seatIndex += 1;
  }
  return [...existingPlayers, ...bots];
}
