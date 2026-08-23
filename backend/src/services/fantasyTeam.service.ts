import { Prisma, type FantasyTeam, type Season, type User } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import type {
  CreateFantasyTeamInput,
  FantasyTeamLineupsQueryInput,
  FantasyTeamMeQueryInput,
} from "../validators/fantasyTeam.validator.js";
import {
  getPermittedLineupsForTeam,
  type LineupVisibilityResponse,
} from "./lineup.service.js";

type FantasyTeamWithOwnerAndSeason = FantasyTeam & {
  user: Pick<User, "id" | "name">;
  season: Season;
};

export type FantasyTeamResponse = {
  id: string;
  name: string;
  managerName: string;
  season: Season;
  createdAt: Date;
  updatedAt: Date;
};

export type FantasyTeamDetailResponse = FantasyTeamResponse & {
  lineups: LineupVisibilityResponse[];
};

function toFantasyTeamResponse(
  fantasyTeam: FantasyTeamWithOwnerAndSeason,
): FantasyTeamResponse {
  return {
    id: fantasyTeam.id,
    name: fantasyTeam.name,
    managerName: fantasyTeam.user.name,
    season: fantasyTeam.season,
    createdAt: fantasyTeam.createdAt,
    updatedAt: fantasyTeam.updatedAt,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function resolveSeasonId(query: FantasyTeamMeQueryInput): Promise<string> {
  if (query.seasonId) {
    return query.seasonId;
  }

  const activeSeason = await prisma.season.findFirst({
    where: { active: true },
    orderBy: { startDate: "desc" },
  });

  if (!activeSeason) {
    throw new AppError(404, "No active season found.");
  }

  return activeSeason.id;
}

export async function createFantasyTeam(
  userId: string,
  input: CreateFantasyTeamInput,
): Promise<FantasyTeamResponse> {
  const season = await prisma.season.findUnique({
    where: { id: input.seasonId },
  });

  if (!season) {
    throw new AppError(404, "Season not found.");
  }

  try {
    const fantasyTeam = await prisma.fantasyTeam.create({
      data: {
        name: input.name,
        seasonId: input.seasonId,
        userId,
      },
      include: {
        season: true,
        user: { select: { id: true, name: true } },
      },
    });

    return toFantasyTeamResponse(fantasyTeam);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        409,
        "You already have a fantasy team for this season.",
      );
    }

    throw error;
  }
}

export async function getMyFantasyTeam(
  userId: string,
  query: FantasyTeamMeQueryInput,
): Promise<FantasyTeamResponse> {
  const seasonId = await resolveSeasonId(query);

  const fantasyTeam = await prisma.fantasyTeam.findUnique({
    where: {
      userId_seasonId: {
        userId,
        seasonId,
      },
    },
    include: {
      season: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
  }

  return toFantasyTeamResponse(fantasyTeam);
}

export async function getFantasyTeamById(
  fantasyTeamId: string,
  requestingUserId: string,
): Promise<FantasyTeamDetailResponse> {
  const fantasyTeam = await prisma.fantasyTeam.findUnique({
    where: { id: fantasyTeamId },
    include: {
      season: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
  }

  const lineups = await getPermittedLineupsForTeam(
    fantasyTeamId,
    requestingUserId,
    {},
  );

  return {
    ...toFantasyTeamResponse(fantasyTeam),
    lineups,
  };
}

export async function getFantasyTeamLineups(
  fantasyTeamId: string,
  requestingUserId: string,
  query: FantasyTeamLineupsQueryInput,
): Promise<LineupVisibilityResponse[]> {
  const fantasyTeam = await prisma.fantasyTeam.findUnique({
    where: { id: fantasyTeamId },
  });

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
  }

  return getPermittedLineupsForTeam(fantasyTeamId, requestingUserId, query);
}
