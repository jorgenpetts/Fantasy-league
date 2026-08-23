import type { Round, Season } from "@prisma/client";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { getRoundDeadlineState } from "../utils/roundDeadline.js";
import { getChipStatus, type ChipStatus } from "./chip.service.js";
import { getOverallLeaderboard, getOverallRank } from "./leaderboard.service.js";
import { getLineup, type LineupResponse } from "./lineup.service.js";

type DashboardRound = {
  id: string;
  roundNumber: number;
  name: string;
  deadline: Date;
  status: Round["status"];
  isLocked: boolean;
  canEdit: boolean;
};

type DashboardTeam = {
  id: string;
  name: string;
};

type DashboardTopPerformer = {
  playerId: string;
  firstName: string;
  lastName: string;
  position: string;
  fantasyPoints: number;
};

export type DashboardResponse = {
  season: Pick<Season, "id" | "name" | "startDate" | "endDate" | "active"> | null;
  currentRound: DashboardRound | null;
  fantasyTeam: DashboardTeam | null;
  lineup: LineupResponse | null;
  roundPoints: number;
  totalPoints: number;
  overallRank: number | null;
  squad: {
    value: number;
    budget: number;
    remainingBudget: number;
  };
  transfers: {
    freeTransfers: number;
    transfersMade: number;
    extraTransfers: number;
    transferPenalty: number;
  };
  chips: ChipStatus | null;
  topPerformers: DashboardTopPerformer[];
  leaderboardPreview: {
    rank: number;
    fantasyTeamId: string;
    fantasyTeamName: string;
    managerName: string;
    totalPoints: number;
  }[];
};

function emptySquad() {
  return {
    value: 0,
    budget: FANTASY_RULES.squad.budget,
    remainingBudget: FANTASY_RULES.squad.budget,
  };
}

function emptyTransfers() {
  return {
    freeTransfers: FANTASY_RULES.transfers.freePerRound,
    transfersMade: 0,
    extraTransfers: 0,
    transferPenalty: 0,
  };
}

function toDashboardRound(round: Round): DashboardRound {
  return {
    id: round.id,
    roundNumber: round.roundNumber,
    name: round.name,
    deadline: round.deadline,
    status: round.status,
    ...getRoundDeadlineState(round),
  };
}

async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { active: true },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      active: true,
    },
  });
}

async function getDashboardRound(seasonId: string) {
  const now = new Date();
  const editableRound = await prisma.round.findFirst({
    where: {
      seasonId,
      status: "UPCOMING",
      deadline: { gt: now },
    },
    orderBy: [{ deadline: "asc" }, { roundNumber: "asc" }],
  });

  if (editableRound) {
    return editableRound;
  }

  return prisma.round.findFirst({
    where: { seasonId },
    orderBy: [{ roundNumber: "desc" }, { deadline: "desc" }],
  });
}

async function getLineupForDashboard(
  fantasyTeamId: string,
  roundId: string,
  userId: string,
) {
  try {
    const lineup = await getLineup(fantasyTeamId, roundId, userId);
    return "lineupLockedForViewing" in lineup ? null : lineup;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 404) {
      return null;
    }

    throw error;
  }
}

async function getTopPerformers(roundId: string): Promise<DashboardTopPerformer[]> {
  const performances = await prisma.playerPerformance.findMany({
    where: { roundId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
        },
      },
    },
    orderBy: [{ fantasyPoints: "desc" }, { player: { lastName: "asc" } }],
    take: 5,
  });

  return performances.map((performance) => ({
    playerId: performance.playerId,
    firstName: performance.player.firstName,
    lastName: performance.player.lastName,
    position: performance.player.position,
    fantasyPoints: performance.fantasyPoints,
  }));
}

export async function getDashboard(userId: string): Promise<DashboardResponse> {
  const season = await getActiveSeason();

  if (!season) {
    return {
      season: null,
      currentRound: null,
      fantasyTeam: null,
      lineup: null,
      roundPoints: 0,
      totalPoints: 0,
      overallRank: null,
      squad: emptySquad(),
      transfers: emptyTransfers(),
      chips: null,
      topPerformers: [],
      leaderboardPreview: [],
    };
  }

  const [round, fantasyTeam, leaderboard] = await Promise.all([
    getDashboardRound(season.id),
    prisma.fantasyTeam.findUnique({
      where: {
        userId_seasonId: {
          userId,
          seasonId: season.id,
        },
      },
      select: {
        id: true,
        name: true,
        totalPoints: true,
      },
    }),
    getOverallLeaderboard(season.id),
  ]);

  const lineup =
    fantasyTeam && round
      ? await getLineupForDashboard(fantasyTeam.id, round.id, userId)
      : null;
  const chips =
    fantasyTeam && round
      ? await getChipStatus(fantasyTeam.id, season.id, round.id)
      : null;
  const overallRank = fantasyTeam
    ? await getOverallRank(fantasyTeam.id, season.id)
    : null;
  const topPerformers = round ? await getTopPerformers(round.id) : [];
  const squadValue = lineup?.squadValue ?? 0;
  const lineupTransfers = lineup?.transfers;

  return {
    season,
    currentRound: round ? toDashboardRound(round) : null,
    fantasyTeam: fantasyTeam
      ? {
          id: fantasyTeam.id,
          name: fantasyTeam.name,
        }
      : null,
    lineup,
    roundPoints: lineup?.roundPoints ?? 0,
    totalPoints: fantasyTeam?.totalPoints ?? 0,
    overallRank,
    squad: {
      value: squadValue,
      budget: FANTASY_RULES.squad.budget,
      remainingBudget: FANTASY_RULES.squad.budget - squadValue,
    },
    transfers: lineupTransfers
      ? {
          freeTransfers: lineupTransfers.freeTransfers,
          transfersMade: lineupTransfers.transfersMade,
          extraTransfers: lineupTransfers.extraTransfers,
          transferPenalty: lineupTransfers.transferPenalty,
        }
      : emptyTransfers(),
    chips,
    topPerformers,
    leaderboardPreview: leaderboard.entries.slice(0, 5).map((entry) => ({
      rank: entry.rank,
      fantasyTeamId: entry.fantasyTeamId,
      fantasyTeamName: entry.fantasyTeamName,
      managerName: entry.managerName,
      totalPoints: entry.totalPoints,
    })),
  };
}
