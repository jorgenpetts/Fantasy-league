import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import type { LeaderboardQueryInput } from "../validators/leaderboard.validator.js";

export type LeaderboardEntry = {
  rank: number;
  fantasyTeamId: string;
  fantasyTeamName: string;
  managerName: string;
  roundPoints?: number;
  totalPoints: number;
};

export type LeaderboardResponse = {
  seasonId: string;
  roundId: string | null;
  rankingStyle: "competition";
  entries: LeaderboardEntry[];
};

async function resolveSeasonId(seasonId?: string) {
  if (seasonId) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true },
    });

    if (!season) {
      throw new AppError(404, "Season not found.");
    }

    return season.id;
  }

  const activeSeason = await prisma.season.findFirst({
    where: { active: true },
    orderBy: { startDate: "desc" },
    select: { id: true },
  });

  if (!activeSeason) {
    throw new AppError(404, "No active season found.");
  }

  return activeSeason.id;
}

function assignCompetitionRanks<T extends { points: number }>(
  rows: T[],
): (T & { rank: number })[] {
  let previousPoints: number | null = null;
  let previousRank = 0;

  return rows.map((row, index) => {
    const rank = previousPoints === row.points ? previousRank : index + 1;
    previousPoints = row.points;
    previousRank = rank;

    return { ...row, rank };
  });
}

export async function getLeaderboard(
  query: LeaderboardQueryInput,
): Promise<LeaderboardResponse> {
  if (query.roundId) {
    return getRoundLeaderboard(query.roundId, query.seasonId);
  }

  return getOverallLeaderboard(query.seasonId);
}

export async function getOverallLeaderboard(
  requestedSeasonId?: string,
): Promise<LeaderboardResponse> {
  const seasonId = await resolveSeasonId(requestedSeasonId);
  const teams = await prisma.fantasyTeam.findMany({
    where: { seasonId },
    include: {
      user: { select: { name: true } },
    },
    orderBy: [
      { totalPoints: "desc" },
      { name: "asc" },
      { id: "asc" },
    ],
  });

  const rankedRows = assignCompetitionRanks(
    teams.map((team) => ({
      points: team.totalPoints,
      fantasyTeamId: team.id,
      fantasyTeamName: team.name,
      managerName: team.user.name,
      totalPoints: team.totalPoints,
    })),
  );

  return {
    seasonId,
    roundId: null,
    rankingStyle: "competition",
    entries: rankedRows.map(({ points: _points, ...entry }) => entry),
  };
}

export async function getRoundLeaderboard(
  roundId: string,
  requestedSeasonId?: string,
): Promise<LeaderboardResponse> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, seasonId: true },
  });

  if (!round) {
    throw new AppError(404, "Round not found.");
  }

  const seasonId = await resolveSeasonId(requestedSeasonId ?? round.seasonId);

  if (round.seasonId !== seasonId) {
    throw new AppError(400, "Round does not belong to the requested season.");
  }

  const lineups = await prisma.fantasyLineup.findMany({
    where: {
      roundId,
      fantasyTeam: { seasonId },
    },
    include: {
      fantasyTeam: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { roundPoints: "desc" },
      { fantasyTeam: { name: "asc" } },
      { fantasyTeamId: "asc" },
    ],
  });

  const rankedRows = assignCompetitionRanks(
    lineups.map((lineup) => ({
      points: lineup.roundPoints,
      fantasyTeamId: lineup.fantasyTeam.id,
      fantasyTeamName: lineup.fantasyTeam.name,
      managerName: lineup.fantasyTeam.user.name,
      roundPoints: lineup.roundPoints,
      totalPoints: lineup.fantasyTeam.totalPoints,
    })),
  );

  return {
    seasonId,
    roundId,
    rankingStyle: "competition",
    entries: rankedRows.map(({ points: _points, ...entry }) => entry),
  };
}

export async function getOverallRank(
  fantasyTeamId: string,
  seasonId: string,
): Promise<number | null> {
  const leaderboard = await getOverallLeaderboard(seasonId);
  return (
    leaderboard.entries.find((entry) => entry.fantasyTeamId === fantasyTeamId)
      ?.rank ?? null
  );
}
