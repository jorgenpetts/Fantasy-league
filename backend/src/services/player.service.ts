import type { CricketPlayer, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import type {
  CreatePlayerInput,
  PlayerQueryInput,
  UpdatePlayerInput,
} from "../validators/player.validator.js";

export type PlayerResponse = CricketPlayer & {
  totalFantasyPoints: number;
};

type PlayerWithTotal = CricketPlayer & {
  totalFantasyPoints?: number;
};

async function resolvePlayerTotalsSeasonId(seasonId?: string) {
  if (seasonId) {
    return seasonId;
  }

  const activeSeason = await prisma.season.findFirst({
    where: { active: true },
    orderBy: { startDate: "desc" },
    select: { id: true },
  });

  return activeSeason?.id;
}

async function getPlayerTotals(playerIds: string[], seasonId?: string) {
  if (playerIds.length === 0) {
    return new Map<string, number>();
  }

  const resolvedSeasonId = await resolvePlayerTotalsSeasonId(seasonId);
  const totals = await prisma.playerPerformance.groupBy({
    by: ["playerId"],
    where: {
      playerId: { in: playerIds },
      ...(resolvedSeasonId ? { round: { seasonId: resolvedSeasonId } } : {}),
    },
    _sum: { fantasyPoints: true },
  });

  return new Map(
    totals.map((total) => [total.playerId, total._sum.fantasyPoints ?? 0]),
  );
}

function toPlayerResponse(player: PlayerWithTotal): PlayerResponse {
  return {
    ...player,
    totalFantasyPoints: player.totalFantasyPoints ?? 0,
  };
}

export async function listPlayers(
  query: PlayerQueryInput,
): Promise<PlayerResponse[]> {
  const where: Prisma.CricketPlayerWhereInput = {
    ...(query.position ? { position: query.position } : {}),
    ...(typeof query.active === "boolean" ? { active: query.active } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const players = await prisma.cricketPlayer.findMany({
    where,
    orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  const totals = await getPlayerTotals(
    players.map((player) => player.id),
    query.seasonId,
  );

  return players.map((player) =>
    toPlayerResponse({
      ...player,
      totalFantasyPoints: totals.get(player.id) ?? 0,
    }),
  );
}

export async function getPlayerById(
  playerId: string,
  seasonId?: string,
): Promise<PlayerResponse> {
  const player = await prisma.cricketPlayer.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    throw new AppError(404, "Player not found.");
  }

  const totals = await getPlayerTotals([player.id], seasonId);

  return toPlayerResponse({
    ...player,
    totalFantasyPoints: totals.get(player.id) ?? 0,
  });
}

export async function createPlayer(
  input: CreatePlayerInput,
): Promise<PlayerResponse> {
  const player = await prisma.cricketPlayer.create({
    data: input,
  });

  return toPlayerResponse(player);
}

export async function updatePlayer(
  playerId: string,
  input: UpdatePlayerInput,
): Promise<PlayerResponse> {
  const existingPlayer = await prisma.cricketPlayer.findUnique({
    where: { id: playerId },
  });

  if (!existingPlayer) {
    throw new AppError(404, "Player not found.");
  }

  const player = await prisma.cricketPlayer.update({
    where: { id: playerId },
    data: input,
  });

  return toPlayerResponse(player);
}
