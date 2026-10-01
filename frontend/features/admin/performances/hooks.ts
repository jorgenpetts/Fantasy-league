"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPerformanceRound,
  recalculateRound,
  saveRoundPerformances,
} from "./api";
import { scoringInvalidationPrefixes, type PerformanceInput } from "./model";

export function usePerformanceRound(roundId?: string) {
  return useQuery({
    queryKey: ["round", roundId],
    queryFn: () => getPerformanceRound(roundId!),
    enabled: Boolean(roundId),
    retry: false,
    refetchOnMount: "always",
  });
}

export function usePerformanceMutations(roundId: string) {
  const client = useQueryClient();
  async function invalidate() {
    await Promise.all(
      scoringInvalidationPrefixes.map((prefix) =>
        client.invalidateQueries({ queryKey: [prefix] }),
      ),
    );
  }
  const save = useMutation({
    mutationFn: (input: PerformanceInput[]) =>
      saveRoundPerformances(roundId, input),
    onSuccess: invalidate,
  });
  const recalculate = useMutation({
    mutationFn: () => recalculateRound(roundId),
    onSuccess: invalidate,
  });
  return { save, recalculate };
}
