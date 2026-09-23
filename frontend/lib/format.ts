import type { PlayerPosition, RoundStatus } from "@/types/api";

export const playerPositionLabels: Record<PlayerPosition, string> = {
  WICKET_KEEPER: "Wicketkeeper",
  BATTER: "Batter",
  ALL_ROUNDER: "All-Rounder",
  BOWLER: "Bowler",
};

export const roundStatusLabels: Record<RoundStatus, string> = {
  UPCOMING: "Upcoming",
  LOCKED: "Locked",
  COMPLETED: "Completed",
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPlayerPrice(value: number) {
  const millions = value / 1_000_000;
  const formatted = new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(millions) ? 0 : 1,
  }).format(millions);

  return `R${formatted}m`;
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat("en-ZA").format(value);
}

export function formatDeadline(value: string | Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRoundName(roundNumber: number, name?: string) {
  return name || `Round ${roundNumber}`;
}

export function getPlayerPositionLabel(position: PlayerPosition) {
  return playerPositionLabels[position];
}
