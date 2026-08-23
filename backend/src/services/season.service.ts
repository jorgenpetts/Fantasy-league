import type { Season } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import type {
  CreateSeasonInput,
  UpdateSeasonInput,
} from "../validators/season.validator.js";

export async function listSeasons(): Promise<Season[]> {
  return prisma.season.findMany({
    orderBy: [{ active: "desc" }, { startDate: "desc" }],
  });
}

export async function getCurrentSeason(): Promise<Season> {
  const season = await prisma.season.findFirst({
    where: { active: true },
    orderBy: { startDate: "desc" },
  });

  if (!season) {
    throw new AppError(404, "No active season found.");
  }

  return season;
}

export async function createSeason(input: CreateSeasonInput): Promise<Season> {
  return prisma.$transaction(async (tx) => {
    if (input.active) {
      await tx.season.updateMany({
        where: { active: true },
        data: { active: false },
      });
    }

    return tx.season.create({
      data: input,
    });
  });
}

export async function updateSeason(
  seasonId: string,
  input: UpdateSeasonInput,
): Promise<Season> {
  const existingSeason = await prisma.season.findUnique({
    where: { id: seasonId },
  });

  if (!existingSeason) {
    throw new AppError(404, "Season not found.");
  }

  const startDate = input.startDate ?? existingSeason.startDate;
  const endDate = input.endDate ?? existingSeason.endDate;

  if (endDate < startDate) {
    throw new AppError(400, "endDate must be on or after startDate.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.active === true) {
      await tx.season.updateMany({
        where: {
          active: true,
          id: { not: seasonId },
        },
        data: { active: false },
      });
    }

    return tx.season.update({
      where: { id: seasonId },
      data: input,
    });
  });
}
