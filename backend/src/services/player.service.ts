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

async function getPlayerTotals(seasonId?: string) {
  const totals = await prisma.playerPerformance.groupBy({
    by: ["playerId"],
    where: {
      round: seasonId
        ? { seasonId }
        : { season: { active: true } },
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

  const [players, totals] = await Promise.all([
    prisma.cricketPlayer.findMany({
      where,
      orderBy: [{ active: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    }),
    getPlayerTotals(query.seasonId),
  ]);

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
  const [player, totals] = await Promise.all([
    prisma.cricketPlayer.findUnique({
      where: { id: playerId },
    }),
    getPlayerTotals(seasonId),
  ]);

  if (!player) {
    throw new AppError(404, "Player not found.");
  }

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
