import type {
  CricketPlayer,
  PlayerPerformance,
  Prisma,
  Round,
  Season,
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getScoringRules } from "../config/scoringRules.js";
import { AppError } from "../utils/AppError.js";
import type {
  BulkUpsertPerformancesInput,
  PlayerPerformancesQueryInput,
  UpsertPerformanceInput,
} from "../validators/performance.validator.js";
import {
  calculateLineupGrossPoints,
  calculatePlayerFantasyPoints,
  getCaptainMultiplier,
} from "./scoring.service.js";
import { calculateTransfers } from "./transfer.service.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

type PerformanceWithRelations = PlayerPerformance & {
  player: CricketPlayer;
  round: Round & {
    season: Season;
  };
};

export type PerformanceResponse = Omit<PerformanceWithRelations, "player"> & {
  player: CricketPlayer;
};

export type RecalculateRoundSummary = {
  roundId: string;
  performancesProcessed: number;
  lineupsProcessed: number;
  fantasyTeamsUpdated: number;
};

function toPerformanceResponse(
  performance: PerformanceWithRelations,
): PerformanceResponse {
  return {
    ...performance,
    player: performance.player,
  };
}

async function ensureRoundAndPlayer(roundId: string, playerId: string) {
  const [round, player] = await Promise.all([
    prisma.round.findUnique({ where: { id: roundId } }),
    prisma.cricketPlayer.findUnique({ where: { id: playerId } }),
  ]);

  if (!round) {
    throw new AppError(404, "Round not found.");
  }

  if (!player) {
    throw new AppError(404, "Player not found.");
  }
}

async function ensureRoundExists(roundId: string, db: DbClient = prisma) {
  const round = await db.round.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new AppError(404, "Round not found.");
  }
}

async function ensurePlayersExist(playerIds: string[], db: DbClient = prisma) {
  const uniquePlayerIds = [...new Set(playerIds)];

  if (uniquePlayerIds.length !== playerIds.length) {
    throw new AppError(400, "A player cannot appear more than once.");
  }

  const players = await db.cricketPlayer.findMany({
    where: { id: { in: uniquePlayerIds } },
    select: { id: true },
  });

  if (players.length !== uniquePlayerIds.length) {
    throw new AppError(404, "One or more players were not found.");
  }
}

export async function listRoundPerformances(
  roundId: string,
): Promise<PerformanceResponse[]> {
  await ensureRoundExists(roundId);

  const performances = await prisma.playerPerformance.findMany({
    where: { roundId },
    include: {
      player: true,
      round: { include: { season: true } },
    },
    orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
  });

  return performances.map(toPerformanceResponse);
}

export async function listPlayerPerformances(
  playerId: string,
  query: PlayerPerformancesQueryInput,
): Promise<PerformanceResponse[]> {
  const player = await prisma.cricketPlayer.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new AppError(404, "Player not found.");
  }

  const performances = await prisma.playerPerformance.findMany({
    where: {
      playerId,
      ...(query.roundId ? { roundId: query.roundId } : {}),
      ...(query.seasonId ? { round: { seasonId: query.seasonId } } : {}),
    },
    include: {
      player: true,
      round: { include: { season: true } },
    },
    orderBy: [{ round: { deadline: "asc" } }],
  });

  return performances.map(toPerformanceResponse);
}

export async function upsertPerformance(
  roundId: string,
  playerId: string,
  input: UpsertPerformanceInput,
): Promise<{
  performance: PerformanceResponse;
  recalculateSummary: RecalculateRoundSummary;
}> {
  await ensureRoundAndPlayer(roundId, playerId);

  await prisma.playerPerformance.upsert({
    where: {
      playerId_roundId: {
        playerId,
        roundId,
      },
    },
    update: input,
    create: {
      ...input,
      playerId,
      roundId,
    },
  });

  const recalculateSummary = await recalculateRound(roundId);
  const performance = await prisma.playerPerformance.findUnique({
    where: {
      playerId_roundId: {
        playerId,
        roundId,
      },
    },
    include: {
      player: true,
      round: { include: { season: true } },
    },
  });

  if (!performance) {
    throw new AppError(500, "Saved performance could not be loaded.");
  }

  return {
    performance: toPerformanceResponse(performance),
    recalculateSummary,
  };
}

export async function bulkUpsertPerformances(
  roundId: string,
  input: BulkUpsertPerformancesInput,
): Promise<RecalculateRoundSummary> {
  return prisma.$transaction(
    async (tx) => {
      await ensureRoundExists(roundId, tx);
      await ensurePlayersExist(
        input.performances.map((performance) => performance.playerId),
        tx,
      );

      for (const performance of input.performances) {
        await tx.playerPerformance.upsert({
          where: {
            playerId_roundId: {
              playerId: performance.playerId,
              roundId,
            },
          },
          update: {
            didBat: performance.didBat,
            runs: performance.runs,
            ballsFaced: performance.ballsFaced,
            wickets: performance.wickets,
            runsConceded: performance.runsConceded,
            ballsBowled: performance.ballsBowled,
            catches: performance.catches,
            droppedCatches: performance.droppedCatches,
            stumpings: performance.stumpings,
            runOuts: performance.runOuts,
          },
          create: {
            ...performance,
            roundId,
          },
        });
      }

      return recalculateRoundWithClient(roundId, tx);
    },
    { timeout: 120_000 },
  );
}

export async function recalculateRound(
  roundId: string,
): Promise<RecalculateRoundSummary> {
  return prisma.$transaction(
    (tx) => recalculateRoundWithClient(roundId, tx),
    { timeout: 120_000 },
  );
}

async function recalculateRoundWithClient(
  roundId: string,
  db: Prisma.TransactionClient,
): Promise<RecalculateRoundSummary> {
  await ensureRoundExists(roundId, db);

  const scoringRules = getScoringRules();
  const performanceRows = await db.playerPerformance.findMany({
    where: { roundId },
  });

  const recalculatedPerformanceRows = performanceRows.map((performance) => ({
    ...performance,
    fantasyPoints: calculatePlayerFantasyPoints(
      performance,
      scoringRules,
    ),
  }));

  const pointsByPlayerId = new Map(
    recalculatedPerformanceRows.map((performance) => [
      performance.playerId,
      performance.fantasyPoints,
    ]),
  );

  const lineups = await db.fantasyLineup.findMany({
    where: { roundId },
    include: {
      fantasyTeam: true,
      round: true,
      players: true,
    },
  });

  const lineupScores = await Promise.all(
    lineups.map(async (lineup) => {
      const activeChip = await db.chipUsage.findUnique({
        where: {
          fantasyTeamId_roundId: {
            fantasyTeamId: lineup.fantasyTeamId,
            roundId: lineup.roundId,
          },
        },
      });
      const previousLineup = await db.fantasyLineup.findFirst({
        where: {
          fantasyTeamId: lineup.fantasyTeamId,
          round: {
            seasonId: lineup.round.seasonId,
            roundNumber: { lt: lineup.round.roundNumber },
          },
        },
        include: { players: true },
        orderBy: { round: { roundNumber: "desc" } },
      });
      const currentPlayerIds = lineup.players.map((player) => player.playerId);
      const previousPlayerIds =
        previousLineup?.players.map((player) => player.playerId) ?? [];
      const transferCalculation = previousLineup
        ? calculateTransfers(previousPlayerIds, currentPlayerIds, activeChip?.chipType)
        : calculateTransfers([], currentPlayerIds, activeChip?.chipType);

      if (!previousLineup) {
        transferCalculation.playersIn = [];
        transferCalculation.playersOut = [];
        transferCalculation.transfersMade = 0;
        transferCalculation.extraTransfers = 0;
        transferCalculation.transferPenalty = 0;
      }

      const grossPoints = calculateLineupGrossPoints(
        lineup,
        lineup.players.map((selectedPlayer) => ({
          playerId: selectedPlayer.playerId,
          fantasyPoints: pointsByPlayerId.get(selectedPlayer.playerId) ?? 0,
        })),
        getCaptainMultiplier({ chipType: activeChip?.chipType }),
      );

      return {
        lineupId: lineup.id,
        fantasyTeamId: lineup.fantasyTeamId,
        grossPoints,
        roundPoints: grossPoints - transferCalculation.transferPenalty,
        transferCalculation,
      };
    }),
  );

  const affectedFantasyTeamIds = [
    ...new Set(lineupScores.map((lineupScore) => lineupScore.fantasyTeamId)),
  ];

  let fantasyTeamsUpdated = 0;

  for (const performance of recalculatedPerformanceRows) {
    await db.playerPerformance.update({
      where: { id: performance.id },
      data: { fantasyPoints: performance.fantasyPoints },
    });
  }

  for (const lineupScore of lineupScores) {
    await db.fantasyLineup.update({
      where: { id: lineupScore.lineupId },
      data: {
        grossPoints: lineupScore.grossPoints,
        roundPoints: lineupScore.roundPoints,
        transfersMade: lineupScore.transferCalculation.transfersMade,
        freeTransfers: lineupScore.transferCalculation.freeTransfers,
        transferPenalty: lineupScore.transferCalculation.transferPenalty,
      },
    });

    await db.lineupTransferSummary.upsert({
      where: { lineupId: lineupScore.lineupId },
      update: {
        playersIn: lineupScore.transferCalculation.playersIn,
        playersOut: lineupScore.transferCalculation.playersOut,
        transfersMade: lineupScore.transferCalculation.transfersMade,
        freeTransfers: lineupScore.transferCalculation.freeTransfers,
        transferPenalty: lineupScore.transferCalculation.transferPenalty,
        wildcardActive: lineupScore.transferCalculation.wildcardActive,
      },
      create: {
        lineupId: lineupScore.lineupId,
        fantasyTeamId: lineupScore.fantasyTeamId,
        roundId,
        playersIn: lineupScore.transferCalculation.playersIn,
        playersOut: lineupScore.transferCalculation.playersOut,
        transfersMade: lineupScore.transferCalculation.transfersMade,
        freeTransfers: lineupScore.transferCalculation.freeTransfers,
        transferPenalty: lineupScore.transferCalculation.transferPenalty,
        wildcardActive: lineupScore.transferCalculation.wildcardActive,
      },
    });
  }

  for (const fantasyTeamId of affectedFantasyTeamIds) {
    const total = await db.fantasyLineup.aggregate({
      where: { fantasyTeamId },
      _sum: { roundPoints: true },
    });

    await db.fantasyTeam.update({
      where: { id: fantasyTeamId },
      data: {
        totalPoints: total._sum.roundPoints ?? 0,
      },
    });

    fantasyTeamsUpdated += 1;
  }

  return {
    roundId,
    performancesProcessed: recalculatedPerformanceRows.length,
    lineupsProcessed: lineupScores.length,
    fantasyTeamsUpdated,
  };
}
