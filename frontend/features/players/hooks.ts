"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getPlayer,
  getPlayerPerformances,
  getPlayers,
} from "@/services/fantasy";
import type { PlayerPosition } from "@/types/api";

export type PlayerSort = "points-desc" | "price-desc" | "price-asc" | "name-asc";

export type PlayerFilters = {
  position?: PlayerPosition;
  search?: string;
  sort: PlayerSort;
};

export function usePlayers(filters: PlayerFilters, enabled = true) {
  const apiFilters = {
    active: true,
    position: filters.position,
    search: filters.search || undefined,
  };

  return useQuery({
    queryKey: queryKeys.players(apiFilters),
    queryFn: () => getPlayers(apiFilters),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePlayer(playerId: string) {
  return useQuery({
    queryKey: queryKeys.player(playerId),
    queryFn: () => getPlayer(playerId),
    enabled: Boolean(playerId),
  });
}

export function usePlayerPerformances(playerId: string) {
  return useQuery({
    queryKey: queryKeys.playerPerformances(playerId),
    queryFn: () => getPlayerPerformances(playerId),
    enabled: Boolean(playerId),
  });
}
