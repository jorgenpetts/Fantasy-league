"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getLeaderboard } from "@/services/fantasy";
import type {
  ChipType,
  CurrentUserLineup,
  FantasyTeamStatus,
} from "@/types/api";
import {
  activateChip,
  createFantasyTeam,
  getFantasyTeam,
  getFantasyTeamLineups,
  getCurrentSeason,
  getFantasyRules,
  getMyFantasyTeamStatus,
  getMyFantasyTeamForSeason,
  getRoundPerformances,
  getSeasonRounds,
  getTeamBuilderLineup,
  removeChip,
  saveLineup,
} from "./api";

function useInvalidateTeamData() {
  const queryClient = useQueryClient();

  return () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.fantasyTeam.me }),
      queryClient.invalidateQueries({ queryKey: queryKeys.fantasyTeam.status }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lineups.current }),
      queryClient.invalidateQueries({ queryKey: ["lineups", "team-round"] }),
    ]);
  };
}

export function useFantasyRules() {
  return useQuery({
    queryKey: queryKeys.fantasyRules,
    queryFn: getFantasyRules,
  });
}

export function useCurrentSeason(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.seasons.current,
    queryFn: getCurrentSeason,
    enabled,
    retry: false,
  });
}

export function useFantasyTeamStatus() {
  return useQuery({
    queryKey: queryKeys.fantasyTeam.status,
    queryFn: getMyFantasyTeamStatus,
  });
}

export function useMyFantasyTeamForSeason(seasonId?: string) {
  return useQuery({
    queryKey: queryKeys.fantasyTeam.meSeason(seasonId),
    queryFn: () => getMyFantasyTeamForSeason(seasonId!),
    enabled: Boolean(seasonId),
    retry: false,
  });
}

export function useFantasyTeamProfile(teamId: string) {
  return useQuery({
    queryKey: queryKeys.fantasyTeam.detail(teamId),
    queryFn: () => getFantasyTeam(teamId),
    enabled: Boolean(teamId),
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useSeasonRounds(seasonId?: string) {
  return useQuery({
    queryKey: queryKeys.seasons.rounds(seasonId),
    queryFn: () => getSeasonRounds(seasonId!),
    enabled: Boolean(seasonId),
  });
}

export function useSeasonLeaderboard(seasonId?: string) {
  return useQuery({
    queryKey: queryKeys.leaderboard({ seasonId }),
    queryFn: () => getLeaderboard({ seasonId }),
    enabled: Boolean(seasonId),
  });
}

export function useFantasyTeamLineups(teamId?: string) {
  return useQuery({
    queryKey: queryKeys.fantasyTeam.lineups(teamId),
    queryFn: () => getFantasyTeamLineups(teamId!),
    enabled: Boolean(teamId),
  });
}

export function useRoundPerformances(roundId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.roundPerformances(roundId),
    queryFn: () => getRoundPerformances(roundId!),
    enabled: Boolean(roundId) && enabled,
  });
}

export function useTeamBuilderLineup(status?: FantasyTeamStatus) {
  const team = status?.fantasyTeam;
  const round = status?.round;

  return useQuery({
    queryKey: queryKeys.lineups.teamRound(team?.id, round?.id),
    queryFn: () => getTeamBuilderLineup(team!, round!),
    enabled: Boolean(team && round),
    retry: false,
  });
}

export function useCreateFantasyTeam() {
  const invalidateTeamData = useInvalidateTeamData();

  return useMutation({
    mutationFn: createFantasyTeam,
    onSuccess: invalidateTeamData,
  });
}

export function useSaveLineup(teamId: string, roundId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { playerIds: string[]; captainId: string }) =>
      saveLineup(teamId, roundId, input),
    onSuccess: ({ lineup }) => {
      queryClient.setQueryData<CurrentUserLineup>(
        queryKeys.lineups.teamRound(teamId, roundId),
        (current) =>
          current
            ? {
                ...current,
                lineup,
                suggestedLineup: null,
              }
            : current,
      );
      queryClient.setQueryData<FantasyTeamStatus>(
        queryKeys.fantasyTeam.status,
        (current) =>
          current
            ? {
                ...current,
                squad: {
                  ...current.squad,
                  value: lineup.squadValue,
                  remainingBudget:
                    current.squad.budget - lineup.squadValue,
                },
                transfers: {
                  freeTransfers: lineup.transfers.freeTransfers,
                  transfersMade: lineup.transfers.transfersMade,
                  extraTransfers: lineup.transfers.extraTransfers,
                  transferPenalty: lineup.transfers.transferPenalty,
                },
              }
            : current,
      );

      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.fantasyTeam.me,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.lineups.current,
        refetchType: "none",
      });
    },
  });
}

export function useActivateChip(teamId: string, roundId: string) {
  const invalidateTeamData = useInvalidateTeamData();

  return useMutation({
    mutationFn: (chipType: ChipType) => activateChip(teamId, roundId, chipType),
    onSuccess: invalidateTeamData,
  });
}

export function useRemoveChip(teamId: string, roundId: string) {
  const invalidateTeamData = useInvalidateTeamData();

  return useMutation({
    mutationFn: () => removeChip(teamId, roundId),
    onSuccess: invalidateTeamData,
  });
}
