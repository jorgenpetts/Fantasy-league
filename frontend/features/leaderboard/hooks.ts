"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getCurrentSeason, getLeaderboard, getLeaderboardRounds } from "./api";

export function useLeaderboardSeason() {
  return useQuery({
    queryKey: queryKeys.seasons.current,
    queryFn: getCurrentSeason,
    retry: false,
  });
}

export function useLeaderboardRounds(seasonId?: string) {
  return useQuery({
    queryKey: queryKeys.seasons.rounds(seasonId),
    queryFn: () => getLeaderboardRounds(seasonId!),
    enabled: Boolean(seasonId),
  });
}

export function useLeaderboard({
  seasonId,
  roundId,
  enabled = true,
}: {
  seasonId?: string;
  roundId?: string;
  enabled?: boolean;
}) {
  const mode = roundId ? "round" : "overall";

  return useQuery({
    queryKey: queryKeys.leaderboard({ mode, seasonId, roundId }),
    queryFn: () => getLeaderboard({ seasonId, roundId }),
    enabled: enabled && Boolean(seasonId),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
