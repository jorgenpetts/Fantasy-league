import { ChipType } from "@prisma/client";
import { FANTASY_RULES } from "../config/fantasyRules.js";

export type TransferCalculation = {
  playersOut: string[];
  playersIn: string[];
  transfersMade: number;
  freeTransfers: number;
  extraTransfers: number;
  transferPenalty: number;
  wildcardActive: boolean;
};

export function calculateTransfers(
  previousPlayerIds: string[],
  currentPlayerIds: string[],
  activeChip?: ChipType | null,
): TransferCalculation {
  const previousPlayers = new Set(previousPlayerIds);
  const currentPlayers = new Set(currentPlayerIds);
  const playersIn = currentPlayerIds.filter((id) => !previousPlayers.has(id));
  const playersOut = previousPlayerIds.filter((id) => !currentPlayers.has(id));
  const transfersMade = playersIn.length;
  const freeTransfers = FANTASY_RULES.transfers.freePerRound;
  const extraTransfers = Math.max(0, transfersMade - freeTransfers);
  const wildcardActive = activeChip === ChipType.WILDCARD;
  const transferPenalty = wildcardActive
    ? 0
    : extraTransfers * FANTASY_RULES.transfers.extraTransferPenalty;

  return {
    playersOut,
    playersIn,
    transfersMade,
    freeTransfers,
    extraTransfers,
    transferPenalty,
    wildcardActive,
  };
}
