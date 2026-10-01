import { api } from "@/lib/api";
import type { Round } from "@/types/api";
import type { PerformanceInput, ScoringSummary } from "./model";

export function getPerformanceRound(roundId: string) {
  return api.get<{ round: Round }>(`/rounds/${encodeURIComponent(roundId)}`);
}

export function saveRoundPerformances(
  roundId: string,
  performances: PerformanceInput[],
) {
  return api.put<ScoringSummary>(
    `/admin/rounds/${encodeURIComponent(roundId)}/performances`,
    { performances },
  );
}

export function recalculateRound(roundId: string) {
  return api.post<ScoringSummary>(
    `/admin/rounds/${encodeURIComponent(roundId)}/recalculate`,
  );
}
