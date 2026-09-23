import { api } from "@/lib/api";
import { getLeaderboard as getLeaderboardRequest } from "@/services/fantasy";
import type { Round, Season } from "@/types/api";

export const getLeaderboard = getLeaderboardRequest;

export function getCurrentSeason() {
  return api.get<{ season: Season }>("/seasons/current");
}

export function getLeaderboardRounds(seasonId: string) {
  const query = new URLSearchParams({ seasonId });

  return api.get<{ rounds: Round[] }>(`/rounds?${query}`);
}
