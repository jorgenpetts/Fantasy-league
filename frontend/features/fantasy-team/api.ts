import { api, ApiError } from "@/lib/api";
import type {
  ChipType,
  CurrentUserLineup,
  FantasyLineup,
  FantasyRules,
  FantasyTeam,
  FantasyTeamStatus,
  HiddenLineup,
  PlayerPerformance,
  Round,
  Season,
} from "@/types/api";

type TeamRound = Pick<
  Round,
  "id" | "roundNumber" | "name" | "deadline" | "status" | "isLocked" | "canEdit"
>;

export function getCurrentSeason() {
  return api.get<{ season: Season }>("/seasons/current");
}

export function getFantasyRules() {
  return api.get<{ fantasyRules: FantasyRules }>("/fantasy-rules");
}

export function getMyFantasyTeamStatus() {
  return api.get<FantasyTeamStatus>("/fantasy-teams/me/status");
}

export function getMyFantasyTeamForSeason(seasonId: string) {
  const query = new URLSearchParams({ seasonId });
  return api.get<{ fantasyTeam: FantasyTeam }>(`/fantasy-teams/me?${query}`);
}

export function getFantasyTeam(teamId: string) {
  return api.get<{ fantasyTeam: FantasyTeam }>(`/fantasy-teams/${teamId}`);
}

export function getSeasonRounds(seasonId: string) {
  const query = new URLSearchParams({ seasonId });
  return api.get<{ rounds: Round[] }>(`/rounds?${query}`);
}

export function getFantasyTeamLineups(teamId: string) {
  return api.get<{ lineups: Array<FantasyLineup | HiddenLineup> }>(
    `/fantasy-teams/${teamId}/lineups`,
  );
}

export function getRoundPerformances(roundId: string) {
  return api.get<{ performances: PlayerPerformance[] }>(
    `/rounds/${roundId}/performances`,
  );
}

export function createFantasyTeam(input: { name: string; seasonId: string }) {
  return api.post<{ fantasyTeam: FantasyTeam }>("/fantasy-teams", input);
}

export async function getTeamBuilderLineup(
  fantasyTeam: NonNullable<FantasyTeamStatus["fantasyTeam"]>,
  round: TeamRound,
): Promise<CurrentUserLineup> {
  if (round.canEdit) {
    return api.get<CurrentUserLineup>("/lineups/me/current");
  }

  try {
    const response = await api.get<{ lineup: FantasyLineup }>(
      `/lineups/${fantasyTeam.id}/${round.id}`,
    );

    return {
      fantasyTeam,
      round,
      lineup: response.lineup,
      suggestedLineup: null,
      previousLineup: null,
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }

    const response = await api.get<{ lineups: Array<FantasyLineup | { lineupLockedForViewing: true }> }>(
      `/fantasy-teams/${fantasyTeam.id}/lineups`,
    );
    const latestVisibleLineup = response.lineups
      .filter((lineup): lineup is FantasyLineup => !("lineupLockedForViewing" in lineup))
      .sort((a, b) => b.round.roundNumber - a.round.roundNumber)[0] ?? null;

    return {
      fantasyTeam,
      round,
      lineup: null,
      suggestedLineup: latestVisibleLineup,
      previousLineup: null,
    };
  }
}

export function saveLineup(
  teamId: string,
  roundId: string,
  input: { playerIds: string[]; captainId: string },
) {
  return api.put<{ lineup: FantasyLineup }>(
    `/lineups/${teamId}/${roundId}`,
    input,
  );
}

export function activateChip(teamId: string, roundId: string, chipType: ChipType) {
  return api.post<{ chipUsage: { id: string; chipType: ChipType } }>(
    `/fantasy-teams/${teamId}/rounds/${roundId}/chip`,
    { chipType },
  );
}

export function removeChip(teamId: string, roundId: string) {
  return api.delete<{ message: string }>(
    `/fantasy-teams/${teamId}/rounds/${roundId}/chip`,
  );
}
