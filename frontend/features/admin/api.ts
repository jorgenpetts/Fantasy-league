import { api } from "@/lib/api";
import type { Player, PlayerPerformance, Round, Season } from "@/types/api";
import type { PlayerInput, RoundInput, SeasonInput } from "./types";

export function getAdminRoundPerformances(roundId: string) {
  return api.get<{ performances: PlayerPerformance[] }>(
    `/admin/rounds/${encodeURIComponent(roundId)}/performances`,
  );
}

export function getSeasons() {
  return api.get<{ seasons: Season[] }>("/seasons");
}

export function createPlayer(input: PlayerInput) {
  return api.post<{ player: Player }>("/admin/players", input);
}

export function updatePlayer(id: string, input: Partial<PlayerInput>) {
  return api.put<{ player: Player }>(
    `/admin/players/${encodeURIComponent(id)}`,
    input,
  );
}

export function createSeason(input: SeasonInput) {
  return api.post<{ season: Season }>("/admin/seasons", input);
}

export function updateSeason(id: string, input: Partial<SeasonInput>) {
  return api.put<{ season: Season }>(
    `/admin/seasons/${encodeURIComponent(id)}`,
    input,
  );
}

export function createRound(input: RoundInput) {
  return api.post<{ round: Round }>("/admin/rounds", input);
}

export function updateRound(id: string, input: Partial<RoundInput>) {
  return api.put<{ round: Round }>(
    `/admin/rounds/${encodeURIComponent(id)}`,
    input,
  );
}
