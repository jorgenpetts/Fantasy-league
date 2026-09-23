import type { ChipStatus, ChipType, FantasyLineup, PlayerPosition } from "@/types/api";

export const positionOrder: PlayerPosition[] = [
  "WICKET_KEEPER",
  "BATTER",
  "ALL_ROUNDER",
  "BOWLER",
];

export function getPlayerName(player: { firstName: string; lastName: string }) {
  return `${player.firstName} ${player.lastName}`;
}

export function getActiveChip(
  lineup: Pick<FantasyLineup, "activeChip"> | null,
  chips: ChipStatus | null,
): ChipType | null {
  return lineup?.activeChip ?? chips?.active ?? null;
}

export function getChipLabel(chipType: ChipType) {
  return chipType === "WILDCARD" ? "Wildcard" : "Triple Captain";
}

export function getChipState(
  chipType: ChipType,
  chips: ChipStatus | null,
  currentRoundId?: string,
) {
  const status =
    chipType === "WILDCARD" ? chips?.wildcard : chips?.tripleCaptain;

  if (!status) {
    return "Not available";
  }

  if (status.usedRoundId === currentRoundId) {
    return "Active this round";
  }

  if (status.usedRoundId) {
    return "Used";
  }

  return status.available ? "Available" : "Unavailable";
}
