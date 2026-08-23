import { Prisma, RoundStatus, type Round, type Season } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { getRoundDeadlineState } from "../utils/roundDeadline.js";
import type {
  CreateRoundInput,
  RoundQueryInput,
  UpdateRoundInput,
} from "../validators/round.validator.js";

type RoundWithSeason = Round & {
  season: Season;
};

export type RoundResponse = RoundWithSeason & {
  isLocked: boolean;
  canEdit: boolean;
};

function toRoundResponse(round: RoundWithSeason, now = new Date()): RoundResponse {
  return {
    ...round,
    ...getRoundDeadlineState(round, now),
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function ensureSeasonExists(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
  });

  if (!season) {
    throw new AppError(404, "Season not found.");
  }
}

export async function listRounds(
  query: RoundQueryInput,
): Promise<RoundResponse[]> {
  const where: Prisma.RoundWhereInput = {
    ...(query.seasonId ? { seasonId: query.seasonId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const rounds = await prisma.round.findMany({
    where,
    include: { season: true },
    orderBy: [{ deadline: "asc" }, { roundNumber: "asc" }],
  });

  const now = new Date();

  return rounds.map((round) => toRoundResponse(round, now));
}

export async function getRoundById(roundId: string): Promise<RoundResponse> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { season: true },
  });

  if (!round) {
    throw new AppError(404, "Round not found.");
  }

  return toRoundResponse(round);
}

export async function getCurrentRound(): Promise<RoundResponse> {
  const activeSeason = await prisma.season.findFirst({
    where: { active: true },
    orderBy: { startDate: "desc" },
  });

  if (!activeSeason) {
    throw new AppError(404, "No active season found.");
  }

  const round = await prisma.round.findFirst({
    where: {
      seasonId: activeSeason.id,
      status: RoundStatus.UPCOMING,
      deadline: { gt: new Date() },
    },
    include: { season: true },
    orderBy: [{ deadline: "asc" }, { roundNumber: "asc" }],
  });

  if (!round) {
    throw new AppError(404, "No current editable round found.");
  }

  return toRoundResponse(round);
}

export async function createRound(
  input: CreateRoundInput,
): Promise<RoundResponse> {
  await ensureSeasonExists(input.seasonId);

  try {
    const round = await prisma.round.create({
      data: input,
      include: { season: true },
    });

    return toRoundResponse(round);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        409,
        "A round with this number already exists for this season.",
      );
    }

    throw error;
  }
}

export async function updateRound(
  roundId: string,
  input: UpdateRoundInput,
): Promise<RoundResponse> {
  const existingRound = await prisma.round.findUnique({
    where: { id: roundId },
  });

  if (!existingRound) {
    throw new AppError(404, "Round not found.");
  }

  if (input.seasonId) {
    await ensureSeasonExists(input.seasonId);
  }

  try {
    const round = await prisma.round.update({
      where: { id: roundId },
      data: input,
      include: { season: true },
    });

    return toRoundResponse(round);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        409,
        "A round with this number already exists for this season.",
      );
    }

    throw error;
  }
}
