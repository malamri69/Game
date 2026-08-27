import type { LocalizedText } from "../roles/types.js";

export interface ActionDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  requiresTarget: boolean;
  /** Can the target be yourself? Only meaningful when requiresTarget is true. */
  allowsSelfTarget: boolean;
  /** null = any living player may use this action; otherwise the exact role required. */
  restrictedToRoleId: string | null;
}

export interface ActionRequest {
  seatId: string;
  actionId: string;
  targetSeatId?: string;
  /** For "trade"/"bribe": an optional gold amount offered, validated against the sender's balance. */
  goldOffer?: number;
  submittedAt: number;
}
