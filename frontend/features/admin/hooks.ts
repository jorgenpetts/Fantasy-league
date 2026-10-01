"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getPlayers } from "@/services/fantasy";
import {
  createPlayer,
  createRound,
  createSeason,
  getAdminRoundPerformances,
  getSeasons,
  updatePlayer,
  updateRound,
  updateSeason,
} from "./api";
import type { PlayerInput, RoundInput, SeasonInput } from "./types";

export function useAdminPlayers(filters?: Parameters<typeof getPlayers>[0]) {
  return useQuery({
    queryKey: queryKeys.players(filters),
    queryFn: () => getPlayers(filters),
  });
}

export function useSeasons() {
  return useQuery({ queryKey: queryKeys.seasons.all, queryFn: getSeasons });
}

export function useAdminPerformances(roundId?: string) {
  return useQuery({
    queryKey: ["admin", "performances", roundId],
    refetchOnMount: "always",
    queryFn: () => getAdminRoundPerformances(roundId!),
    enabled: Boolean(roundId),
  });
}

// Invalidate shared domains, including cached lineups that embed player/round data.
// Auth and unrelated configuration stay cached. No optimistic admin writes.
function useInvalidateAdminData(domain: "player" | "season" | "round") {
  const client = useQueryClient();
  return async () => {
    const prefixes =
      domain === "player"
        ? [
            "players",
            "player",
            "dashboard",
            "fantasy-team",
            "lineups",
            "round",
            "admin",
          ]
        : [
            "seasons",
            "round",
            "dashboard",
            "fantasy-team",
            "lineups",
            "leaderboard",
            "admin",
            ...(domain === "season" ? ["players", "player"] : []),
          ];
    await Promise.all(
      prefixes.map((prefix) =>
        client.invalidateQueries({ queryKey: [prefix] }),
      ),
    );
  };
}

type SaveInput<T> =
  { id: string; input: Partial<T> } | { id?: undefined; input: T };

export function useSavePlayer() {
  const invalidate = useInvalidateAdminData("player");
  return useMutation({
    mutationFn: ({ id, input }: SaveInput<PlayerInput>) =>
      id === undefined
        ? createPlayer(input as PlayerInput)
        : updatePlayer(id, input),
    onSuccess: invalidate,
  });
}

export function useSaveSeason() {
  const invalidate = useInvalidateAdminData("season");
  return useMutation({
    mutationFn: ({ id, input }: SaveInput<SeasonInput>) =>
      id === undefined
        ? createSeason(input as SeasonInput)
        : updateSeason(id, input),
    onSuccess: invalidate,
  });
}

export function useSaveRound() {
  const invalidate = useInvalidateAdminData("round");
  return useMutation({
    mutationFn: ({ id, input }: SaveInput<RoundInput>) =>
      id === undefined
        ? createRound(input as RoundInput)
        : updateRound(id, input),
    onSuccess: invalidate,
  });
}
