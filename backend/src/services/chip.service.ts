import { ChipType, type Prisma } from "@prisma/client";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { canEditRound } from "../utils/roundDeadline.js";
import { recalculateRound } from "./performance.service.js";

export type ChipStatus = {
  active: ChipType | null;
  wildcard: {
    available: boolean;
    usedRoundId: string | null;
  };
  tripleCaptain: {
    available: boolean;
    usedRoundId: string | null;
  };
};

async function getOwnedTeamAndRound(
  fantasyTeamId: string,
  roundId: string,
  userId: string,
  db: Prisma.TransactionClient = prisma,
) {
  const [fantasyTeam, round] = await Promise.all([
    db.fantasyTeam.findUnique({ where: { id: fantasyTeamId } }),
    db.round.findUnique({ where: { id: roundId } }),
  ]);

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
  }

  if (fantasyTeam.userId !== userId) {
    throw new AppError(403, "You can only manage chips for your own team.");
  }

  if (!round) {
    throw new AppError(404, "Round not found.");
  }

  if (fantasyTeam.seasonId !== round.seasonId) {
    throw new AppError(
      400,
      "Fantasy team and round must belong to the same season.",
    );
  }

  if (!canEditRound(round)) {
    throw new AppError(403, "This round is locked and chip choice is immutable.");
  }

  return { fantasyTeam, round };
}

export async function getActiveChipForRound(
  fantasyTeamId: string,
  roundId: string,
): Promise<ChipType | null> {
  const chipUsage = await prisma.chipUsage.findUnique({
    where: {
      fantasyTeamId_roundId: {
        fantasyTeamId,
        roundId,
      },
    },
  });

  return chipUsage?.chipType ?? null;
}

export async function getChipStatus(
  fantasyTeamId: string,
  seasonId: string,
  roundId?: string,
): Promise<ChipStatus> {
  const chipUsages = await prisma.chipUsage.findMany({
    where: {
      fantasyTeamId,
      round: { seasonId },
    },
  });

  const wildcardUsage = chipUsages.find(
    (usage) => usage.chipType === ChipType.WILDCARD,
  );
  const tripleCaptainUsage = chipUsages.find(
    (usage) => usage.chipType === ChipType.TRIPLE_CAPTAIN,
  );
  const activeUsage = roundId
    ? chipUsages.find((usage) => usage.roundId === roundId)
    : undefined;

  return {
    active: activeUsage?.chipType ?? null,
    wildcard: {
      available:
        !wildcardUsage ||
        wildcardUsage.roundId === roundId ||
        FANTASY_RULES.chips.perSeason[ChipType.WILDCARD] > 1,
      usedRoundId: wildcardUsage?.roundId ?? null,
    },
    tripleCaptain: {
      available:
        !tripleCaptainUsage ||
        tripleCaptainUsage.roundId === roundId ||
        FANTASY_RULES.chips.perSeason[ChipType.TRIPLE_CAPTAIN] > 1,
      usedRoundId: tripleCaptainUsage?.roundId ?? null,
    },
  };
}

export async function activateChip(
  fantasyTeamId: string,
  roundId: string,
  userId: string,
  chipType: ChipType,
) {
  const chipUsage = await prisma.$transaction(async (tx) => {
    // Serialize chip choices for this team, including requests for different rounds.
    await tx.$queryRaw`SELECT "id" FROM "FantasyTeam" WHERE "id" = ${fantasyTeamId} FOR UPDATE`;
    const { round } = await getOwnedTeamAndRound(fantasyTeamId, roundId, userId, tx);
    const current = await tx.chipUsage.findUnique({
      where: { fantasyTeamId_roundId: { fantasyTeamId, roundId } },
    });
    if (current && current.chipType !== chipType) {
      throw new AppError(409, "Another chip is active. Remove it before choosing a different chip.");
    }
    const existingSeasonUsage = await tx.chipUsage.findFirst({
      where: {
        fantasyTeamId,
        chipType,
        round: { seasonId: round.seasonId },
      },
    });

    if (existingSeasonUsage && existingSeasonUsage.roundId !== roundId) {
      throw new AppError(409, `${chipType} has already been used this season.`);
    }

    return tx.chipUsage.upsert({
      where: { fantasyTeamId_roundId: { fantasyTeamId, roundId } },
      update: {},
      create: { fantasyTeamId, roundId, chipType },
    });
  });

  await recalculateRound(roundId);

  return chipUsage;
}

export async function removeChip(
  fantasyTeamId: string,
  roundId: string,
  userId: string,
) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "FantasyTeam" WHERE "id" = ${fantasyTeamId} FOR UPDATE`;
    await getOwnedTeamAndRound(fantasyTeamId, roundId, userId, tx);
    await tx.chipUsage.deleteMany({ where: { fantasyTeamId, roundId } });
  });

  await recalculateRound(roundId);
}
