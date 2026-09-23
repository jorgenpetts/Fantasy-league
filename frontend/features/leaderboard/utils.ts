import type { Round } from "@/types/api";

function newestRound(rounds: Round[]) {
  return [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)[0];
}

export function getDefaultLeaderboardRound(rounds: Round[]) {
  return (
    newestRound(rounds.filter((round) => round.status === "COMPLETED")) ??
    newestRound(
      rounds.filter(
        (round) => round.status === "LOCKED" || round.isLocked || !round.canEdit,
      ),
    ) ??
    newestRound(rounds)
  );
}

export function getLeaderboardTeamHref(
  fantasyTeamId: string,
  currentTeamId?: string,
) {
  return fantasyTeamId === currentTeamId ? "/team" : `/team/${fantasyTeamId}`;
}
