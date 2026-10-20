import { Prisma, type FantasyLineup } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import { canEditRound } from "../utils/roundDeadline.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

type SourceLineup = {
  fantasyTeamId: string;
  captainId: string;
  players: { playerId: string }[];
};

export type CarryForwardSummary = {
  roundId: string;
  created: number;
  alreadyExisting: number;
  noPreviousLineup: number;
};

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function getSourceRound(roundId: string) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });

  if (!round) {
    throw new AppError(404, "Round not found.");
  }

  // Carry only while the target round can still be edited. Scoring an old
  // round must never create a historical lineup that was not saved for it.
  if (!canEditRound(round)) return null;

  const previousRound = await prisma.round.findFirst({
    where: { seasonId: round.seasonId, roundNumber: { lt: round.roundNumber } },
    orderBy: { roundNumber: "desc" },
  });

  // The previous selections must be final before copying them to a new round.
  // Performance entry and scoring do not change those selections.
  if (!previousRound || canEditRound(previousRound) ||
      (previousRound.deadline > round.deadline && previousRound.updatedAt > round.deadline)) {
    return null;
  }

  return { previousRound, targetDeadline: round.deadline };
}

async function createIfMissing(
  roundId: string,
  source: SourceLineup,
): Promise<{ lineup: FantasyLineup; created: boolean }> {
  const key = { fantasyTeamId: source.fantasyTeamId, roundId };
  const existing = await prisma.fantasyLineup.findUnique({
    where: { fantasyTeamId_roundId: key },
  });

  if (existing) {
    return { lineup: existing, created: false };
  }

  try {
    // Nested creation is atomic and gives this round independent player rows.
    const lineup = await prisma.fantasyLineup.create({
      data: {
        ...key,
        captainId: source.captainId,
        freeTransfers: FANTASY_RULES.transfers.freePerRound,
        players: {
          create: source.players.map(({ playerId }) => ({ playerId })),
        },
      },
    });
    return { lineup, created: true };
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const winner = await prisma.fantasyLineup.findUnique({
      where: { fantasyTeamId_roundId: key },
    });
    if (!winner) throw error;
    return { lineup: winner, created: false };
  }
}

export async function ensureRoundLineup(
  fantasyTeamId: string,
  roundId: string,
): Promise<FantasyLineup | null> {
  const existing = await prisma.fantasyLineup.findUnique({
    where: { fantasyTeamId_roundId: { fantasyTeamId, roundId } },
  });
  if (existing) return existing;

  const sourceRound = await getSourceRound(roundId);
  if (!sourceRound) return null;

  const source = await prisma.fantasyLineup.findUnique({
    where: {
      fantasyTeamId_roundId: { fantasyTeamId, roundId: sourceRound.previousRound.id },
      fantasyTeam: { createdAt: { lte: sourceRound.targetDeadline } },
    },
    select: {
      fantasyTeamId: true,
      captainId: true,
      players: { select: { playerId: true } },
    },
  });

  return source ? (await createIfMissing(roundId, source)).lineup : null;
}

export async function initializeRoundLineups(roundId: string): Promise<CarryForwardSummary> {
  const summary: CarryForwardSummary = {
    roundId,
    created: 0,
    alreadyExisting: 0,
    noPreviousLineup: 0,
  };
  const sourceRound = await getSourceRound(roundId);
  if (!sourceRound) return summary;

  const [sources, teamCount] = await Promise.all([
    prisma.fantasyLineup.findMany({
      where: {
        roundId: sourceRound.previousRound.id,
        fantasyTeam: { createdAt: { lte: sourceRound.targetDeadline } },
      },
      select: {
        fantasyTeamId: true,
        captainId: true,
        players: { select: { playerId: true } },
      },
    }),
    prisma.fantasyTeam.count({ where: { seasonId: sourceRound.previousRound.seasonId } }),
  ]);
  summary.noPreviousLineup = teamCount - sources.length;

  for (const source of sources) {
    const result = await createIfMissing(roundId, source);
    if (result.created) summary.created += 1;
    else summary.alreadyExisting += 1;
  }

  if (summary.created > 0) {
    logger.info("Round lineups carried forward", summary);
  }

  return summary;
}
