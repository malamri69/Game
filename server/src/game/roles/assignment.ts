import type { SecureRng } from "../../security/rng.js";
import type { Player } from "../types.js";
import { getRole } from "./catalog.js";

/**
 * Role sets by player count (section 6/54: 6-10 players, 8 is default).
 * King, Traitor, Investigator, and Guardian are always present — they're
 * the core tension. Merchant/Spy/Commander are added as the lobby grows,
 * Citizen fills the rest.
 */
const ROLE_SETS: Record<number, string[]> = {
  6: ["king", "traitor", "investigator", "guardian", "merchant", "citizen"],
  7: ["king", "traitor", "investigator", "guardian", "merchant", "spy", "citizen"],
  8: ["king", "traitor", "investigator", "guardian", "merchant", "spy", "commander", "citizen"],
  9: ["king", "traitor", "investigator", "guardian", "merchant", "spy", "commander", "citizen", "citizen"],
  10: ["king", "traitor", "investigator", "guardian", "merchant", "spy", "commander", "citizen", "citizen", "citizen"]
};

export function roleSetForPlayerCount(count: number): string[] {
  const set = ROLE_SETS[count];
  if (!set) {
    throw new Error(`No role set configured for ${count} players (supported: 6-10)`);
  }
  return set;
}

/**
 * Assigns roles server-side only (section 8: the client never decides its
 * own role). Uses the CSPRNG for both the seat shuffle and the role
 * shuffle so seat order can't be used to infer role order.
 */
export function assignRoles(players: Player[], rng: SecureRng): void {
  const roleIds = roleSetForPlayerCount(players.length);
  if (roleIds.length !== players.length) {
    throw new Error(`Role set size (${roleIds.length}) does not match player count (${players.length})`);
  }
  const shuffledRoles = rng.shuffle(roleIds);
  const shuffledPlayers = rng.shuffle(players);
  shuffledPlayers.forEach((player, i) => {
    player.roleId = shuffledRoles[i];
  });
}

/** A pool of flavor rumors (section 9) — each true in-world, none of them a
 * full role reveal. Every player gets one, and it's picked so no two
 * players in the same match necessarily see the same rumor. */
const RUMOR_POOL: Array<{ ar: string; en: string; aboutRoleId: string }> = [
  { ar: "قائد الحرس يملك مفتاح القصر.", en: "The Commander holds a key to the palace.", aboutRoleId: "commander" },
  { ar: "أحد التجار يخفي كيسًا من الذهب.", en: "One of the merchants is hiding a bag of gold.", aboutRoleId: "merchant" },
  { ar: "شخص ما يراقب تحركات الحاشية.", en: "Someone is watching the court's every move.", aboutRoleId: "spy" },
  { ar: "الحارس لا يثق بأحد هذه الليلة.", en: "The Guardian trusts no one tonight.", aboutRoleId: "guardian" },
  { ar: "هناك من يبحث عن أدلة بين الجدران.", en: "Someone is digging for evidence within these walls.", aboutRoleId: "investigator" },
  { ar: "سُمع همس عن خيانة قريبة من العرش.", en: "Whispers of betrayal near the throne have been heard.", aboutRoleId: "traitor" },
  { ar: "الملك قلق أكثر من المعتاد الليلة.", en: "The King seems more anxious than usual tonight.", aboutRoleId: "king" }
];

export interface SecretInfo {
  ar: string;
  en: string;
}

/** Assigns each player a personalized rumor, distinct from their own role
 * where possible, so no two players necessarily hold the same information
 * (section 9). */
export function generateSecretInfo(players: readonly Player[], rng: SecureRng): Map<string, SecretInfo> {
  const info = new Map<string, SecretInfo>();
  for (const player of players) {
    const candidates = RUMOR_POOL.filter((r) => r.aboutRoleId !== player.roleId);
    const pool = candidates.length > 0 ? candidates : RUMOR_POOL;
    const rumor = rng.pick(pool);
    info.set(player.seatId, { ar: rumor.ar, en: rumor.en });
  }
  return info;
}

export interface PublicRoleView {
  roleId: string;
  name: { ar: string; en: string };
  objective: { ar: string; en: string };
  abilityDescription: { ar: string; en: string };
}

/** What a player is allowed to see about *their own* role. Never call this
 * for anyone but the owning seat — the realtime layer (Phase 8) is
 * responsible for that isolation. */
export function ownRoleView(player: Player): PublicRoleView {
  if (!player.roleId) throw new Error(`Player ${player.seatId} has no role assigned yet`);
  const role = getRole(player.roleId);
  return {
    roleId: role.id,
    name: role.name,
    objective: role.objective,
    abilityDescription: role.abilityDescription
  };
}
