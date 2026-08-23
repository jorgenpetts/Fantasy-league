import {
  ChipType,
  Prisma,
  type CricketPlayer,
  type FantasyLineup,
  type FantasyLineupPlayer,
  type FantasyTeam,
  type Round,
  type Season,
  type User,
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import { AppError } from "../utils/AppError.js";
import { canEditRound, getRoundDeadlineState } from "../utils/roundDeadline.js";
import { calculateSquadValue } from "../utils/squadValue.js";
import { getActiveChipForRound, getChipStatus, type ChipStatus } from "./chip.service.js";
import { validateSquadPlayers } from "./squadValidation.service.js";
import { calculateTransfers, type TransferCalculation } from "./transfer.service.js";
import type { FantasyTeamLineupsQueryInput } from "../validators/fantasyTeam.validator.js";
import type {
  ManualLineupInput,
  SaveLineupInput,
} from "../validators/lineup.validator.js";

type PlayerSelection = Pick<
  CricketPlayer,
  "id" | "firstName" | "lastName" | "position" | "price" | "active"
>;

type LineupWithDetails = FantasyLineup & {
  fantasyTeam: FantasyTeam & {
    user: Pick<User, "id" | "name">;
    chipUsages: {
      roundId: string;
      chipType: ChipType;
    }[];
  };
  round: Round & {
    season: Season;
  };
  captain: PlayerSelection;
  players: (FantasyLineupPlayer & {
    player: PlayerSelection;
  })[];
  transferSummary: {
    playersIn: string[];
    playersOut: string[];
    wildcardActive: boolean;
  } | null;
};

export type LineupPlayerResponse = {
  id: string;
  firstName: string;
  lastName: string;
  position: CricketPlayer["position"];
  price: number;
  active: boolean;
};

export type LineupResponse = {
  id: string;
  fantasyTeam: {
    id: string;
    name: string;
    managerName: string;
  };
  round: {
    id: string;
    roundNumber: number;
    name: string;
    deadline: Date;
    status: Round["status"];
    isLocked: boolean;
    canEdit: boolean;
  };
  captainId: string;
  players: LineupPlayerResponse[];
  squadValue: number;
  grossPoints: number;
  roundPoints: number;
  transfers: {
    transfersMade: number;
    freeTransfers: number;
    extraTransfers: number;
    transferPenalty: number;
    playersIn: string[];
    playersOut: string[];
    wildcardActive: boolean;
  };
  activeChip: ChipType | null;
  createdAt: Date;
};

export type HiddenLineupResponse = {
  team: {
    id: string;
    name: string;
    managerName: string;
  };
  round: {
    id: string;
    roundNumber: number;
    name: string;
    deadline: Date;
    status: Round["status"];
    isLocked: boolean;
    canEdit: boolean;
  };
  lineupLockedForViewing: true;
};

export type LineupVisibilityResponse = LineupResponse | HiddenLineupResponse;

export type CurrentUserLineupResponse = {
  fantasyTeam: {
    id: string;
    name: string;
  };
  round: {
    id: string;
    roundNumber: number;
    name: string;
    deadline: Date;
    status: Round["status"];
    isLocked: boolean;
    canEdit: boolean;
  };
  lineup: LineupResponse | null;
  suggestedLineup: LineupResponse | null;
};

export type FantasyTeamStatusResponse = {
  round: CurrentUserLineupResponse["round"] | null;
  fantasyTeam: {
    id: string;
    name: string;
  } | null;
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
};

function toLineupPlayerResponse(player: PlayerSelection): LineupPlayerResponse {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    price: player.price,
    active: player.active,
  };
}

function toLineupResponse(lineup: LineupWithDetails): LineupResponse {
  const selectedPlayers = lineup.players.map(({ player }) => player);
  const transferSummary = lineup.transferSummary;
  const activeChip =
    lineup.fantasyTeam.chipUsages.find(
      (chipUsage) => chipUsage.roundId === lineup.roundId,
    )?.chipType ?? null;

  return {
    id: lineup.id,
    fantasyTeam: {
      id: lineup.fantasyTeam.id,
      name: lineup.fantasyTeam.name,
      managerName: lineup.fantasyTeam.user.name,
    },
    round: {
      id: lineup.round.id,
      roundNumber: lineup.round.roundNumber,
      name: lineup.round.name,
      deadline: lineup.round.deadline,
      status: lineup.round.status,
      ...getRoundDeadlineState(lineup.round),
    },
    captainId: lineup.captainId,
    players: selectedPlayers.map(toLineupPlayerResponse),
    squadValue: calculateSquadValue(selectedPlayers),
    grossPoints: lineup.grossPoints,
    roundPoints: lineup.roundPoints,
    transfers: {
      transfersMade: lineup.transfersMade,
      freeTransfers: lineup.freeTransfers,
      extraTransfers: Math.max(0, lineup.transfersMade - lineup.freeTransfers),
      transferPenalty: lineup.transferPenalty,
      playersIn: transferSummary?.playersIn ?? [],
      playersOut: transferSummary?.playersOut ?? [],
      wildcardActive: transferSummary?.wildcardActive ?? false,
    },
    activeChip,
    createdAt: lineup.createdAt,
  };
}

function toHiddenLineupResponse(
  fantasyTeam: FantasyTeam & { user: Pick<User, "name"> },
  round: Round,
): HiddenLineupResponse {
  return {
    team: {
      id: fantasyTeam.id,
      name: fantasyTeam.name,
      managerName: fantasyTeam.user.name,
    },
    round: {
      id: round.id,
      roundNumber: round.roundNumber,
      name: round.name,
      deadline: round.deadline,
      status: round.status,
      ...getRoundDeadlineState(round),
    },
    lineupLockedForViewing: true,
  };
}

function canViewLineupPlayers(
  fantasyTeam: Pick<FantasyTeam, "userId">,
  round: Pick<Round, "status" | "deadline">,
  requestingUserId: string,
): boolean {
  return fantasyTeam.userId === requestingUserId || !canEditRound(round);
}

function isManualLineupInput(input: SaveLineupInput): input is ManualLineupInput {
  return "playerIds" in input;
}

async function getFantasyTeamAndRound(teamId: string, roundId: string) {
  const [fantasyTeam, round] = await Promise.all([
    prisma.fantasyTeam.findUnique({
      where: { id: teamId },
      include: {
        user: { select: { id: true, name: true } },
        season: true,
      },
    }),
    prisma.round.findUnique({
      where: { id: roundId },
      include: { season: true },
    }),
  ]);

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
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

  return { fantasyTeam, round };
}

async function getLineupWithDetails(lineupId: string) {
  return prisma.fantasyLineup.findUnique({
    where: { id: lineupId },
    include: {
      fantasyTeam: {
        include: {
          user: { select: { id: true, name: true } },
          chipUsages: { select: { roundId: true, chipType: true } },
        },
      },
      round: { include: { season: true } },
      captain: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          price: true,
          active: true,
        },
      },
      players: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              price: true,
              active: true,
            },
          },
        },
        orderBy: { player: { lastName: "asc" } },
      },
      transferSummary: {
        select: {
          playersIn: true,
          playersOut: true,
          wildcardActive: true,
        },
      },
    },
  });
}

async function findPreviousLineup(
  fantasyTeamId: string,
  round: Pick<Round, "seasonId" | "roundNumber">,
) {
  return prisma.fantasyLineup.findFirst({
    where: {
      fantasyTeamId,
      round: {
        seasonId: round.seasonId,
        roundNumber: { lt: round.roundNumber },
      },
    },
    include: {
      fantasyTeam: {
        include: {
          user: { select: { id: true, name: true } },
          chipUsages: { select: { roundId: true, chipType: true } },
        },
      },
      round: { include: { season: true } },
      captain: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          price: true,
          active: true,
        },
      },
      players: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              price: true,
              active: true,
            },
          },
        },
      },
      transferSummary: {
        select: {
          playersIn: true,
          playersOut: true,
          wildcardActive: true,
        },
      },
    },
    orderBy: { round: { roundNumber: "desc" } },
  });
}

async function validateSelectedPlayers(input: ManualLineupInput) {
  const uniquePlayerIds = [...new Set(input.playerIds)];

  if (uniquePlayerIds.length !== input.playerIds.length) {
    throw new AppError(400, "A player cannot be selected more than once.");
  }

  if (!uniquePlayerIds.includes(input.captainId)) {
    throw new AppError(400, "Captain must be one of the selected players.");
  }

  const players = await prisma.cricketPlayer.findMany({
    where: { id: { in: uniquePlayerIds } },
  });

  if (players.length !== uniquePlayerIds.length) {
    throw new AppError(400, "All selected players must exist.");
  }

  validateSquadPlayers(players, input.captainId);

  return {
    playerIds: uniquePlayerIds,
    players,
  };
}

async function resolveLineupInput(
  fantasyTeamId: string,
  round: Round,
  input: SaveLineupInput,
): Promise<ManualLineupInput> {
  if (isManualLineupInput(input)) {
    return input;
  }

  const previousLineup = await findPreviousLineup(fantasyTeamId, round);

  if (!previousLineup) {
    throw new AppError(404, "No previous lineup found to copy.");
  }

  const playerIds = previousLineup.players.map(({ playerId }) => playerId);

  if (!playerIds.includes(previousLineup.captainId)) {
    throw new AppError(400, "Previous lineup captain is not in the squad.");
  }

  return {
    playerIds,
    captainId: previousLineup.captainId,
  };
}

export async function saveLineup(
  teamId: string,
  roundId: string,
  requestingUserId: string,
  input: SaveLineupInput,
): Promise<LineupResponse> {
  const { fantasyTeam, round } = await getFantasyTeamAndRound(teamId, roundId);

  if (fantasyTeam.userId !== requestingUserId) {
    throw new AppError(403, "You can only edit your own fantasy team.");
  }

  if (!canEditRound(round)) {
    throw new AppError(403, "This round is locked and can no longer be edited.");
  }

  const resolvedInput = await resolveLineupInput(teamId, round, input);
  const { playerIds } = await validateSelectedPlayers(resolvedInput);
  const previousLineup = await findPreviousLineup(teamId, round);
  const previousPlayerIds = previousLineup
    ? previousLineup.players.map(({ playerId }) => playerId)
    : [];
  const activeChip = await getActiveChipForRound(teamId, roundId);
  const transferCalculation = previousLineup
    ? calculateTransfers(previousPlayerIds, playerIds, activeChip)
    : calculateTransfers([], playerIds, activeChip);

  if (!previousLineup) {
    transferCalculation.playersIn = [];
    transferCalculation.playersOut = [];
    transferCalculation.transfersMade = 0;
    transferCalculation.extraTransfers = 0;
    transferCalculation.transferPenalty = 0;
  }

  const lineup = await prisma.$transaction(async (tx) => {
    const savedLineup = await tx.fantasyLineup.upsert({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: teamId,
          roundId,
        },
      },
      update: {
        captainId: resolvedInput.captainId,
        transfersMade: transferCalculation.transfersMade,
        freeTransfers: transferCalculation.freeTransfers,
        transferPenalty: transferCalculation.transferPenalty,
      },
      create: {
        fantasyTeamId: teamId,
        roundId,
        captainId: resolvedInput.captainId,
        transfersMade: transferCalculation.transfersMade,
        freeTransfers: transferCalculation.freeTransfers,
        transferPenalty: transferCalculation.transferPenalty,
      },
    });

    await tx.fantasyLineupPlayer.deleteMany({
      where: { lineupId: savedLineup.id },
    });

    await tx.fantasyLineupPlayer.createMany({
      data: playerIds.map((playerId) => ({
        lineupId: savedLineup.id,
        playerId,
      })),
    });

    await tx.lineupTransferSummary.upsert({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: teamId,
          roundId,
        },
      },
      update: {
        lineupId: savedLineup.id,
        playersIn: transferCalculation.playersIn,
        playersOut: transferCalculation.playersOut,
        transfersMade: transferCalculation.transfersMade,
        freeTransfers: transferCalculation.freeTransfers,
        transferPenalty: transferCalculation.transferPenalty,
        wildcardActive: transferCalculation.wildcardActive,
      },
      create: {
        fantasyTeamId: teamId,
        roundId,
        lineupId: savedLineup.id,
        playersIn: transferCalculation.playersIn,
        playersOut: transferCalculation.playersOut,
        transfersMade: transferCalculation.transfersMade,
        freeTransfers: transferCalculation.freeTransfers,
        transferPenalty: transferCalculation.transferPenalty,
        wildcardActive: transferCalculation.wildcardActive,
      },
    });

    return savedLineup;
  });

  const lineupWithDetails = await getLineupWithDetails(lineup.id);

  if (!lineupWithDetails) {
    throw new AppError(500, "Saved lineup could not be loaded.");
  }

  return toLineupResponse(lineupWithDetails);
}

export async function getLineup(
  teamId: string,
  roundId: string,
  requestingUserId: string,
): Promise<LineupVisibilityResponse> {
  const { fantasyTeam, round } = await getFantasyTeamAndRound(teamId, roundId);

  if (!canViewLineupPlayers(fantasyTeam, round, requestingUserId)) {
    return toHiddenLineupResponse(fantasyTeam, round);
  }

  const lineup = await prisma.fantasyLineup.findUnique({
    where: {
      fantasyTeamId_roundId: {
        fantasyTeamId: teamId,
        roundId,
      },
    },
  });

  if (!lineup) {
    throw new AppError(404, "Lineup not found.");
  }

  const lineupWithDetails = await getLineupWithDetails(lineup.id);

  if (!lineupWithDetails) {
    throw new AppError(404, "Lineup not found.");
  }

  return toLineupResponse(lineupWithDetails);
}

export async function getPermittedLineupsForTeam(
  fantasyTeamId: string,
  requestingUserId: string,
  query: FantasyTeamLineupsQueryInput,
): Promise<LineupVisibilityResponse[]> {
  const fantasyTeam = await prisma.fantasyTeam.findUnique({
    where: { id: fantasyTeamId },
    include: { user: { select: { name: true } } },
  });

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
  }

  const lineups = await prisma.fantasyLineup.findMany({
    where: {
      fantasyTeamId,
      ...(query.roundId ? { roundId: query.roundId } : {}),
    },
    include: {
      fantasyTeam: {
        include: {
          user: { select: { id: true, name: true } },
          chipUsages: { select: { roundId: true, chipType: true } },
        },
      },
      round: { include: { season: true } },
      captain: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          price: true,
          active: true,
        },
      },
      players: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
              price: true,
              active: true,
            },
          },
        },
        orderBy: { player: { lastName: "asc" } },
      },
      transferSummary: {
        select: {
          playersIn: true,
          playersOut: true,
          wildcardActive: true,
        },
      },
    },
    orderBy: { round: { roundNumber: "asc" } },
  });

  return lineups.map((lineup) => {
    if (!canViewLineupPlayers(lineup.fantasyTeam, lineup.round, requestingUserId)) {
      return toHiddenLineupResponse(fantasyTeam, lineup.round);
    }

    return toLineupResponse(lineup);
  });
}

export async function getMyCurrentLineup(
  requestingUserId: string,
): Promise<CurrentUserLineupResponse> {
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
      status: "UPCOMING",
      deadline: { gt: new Date() },
    },
    orderBy: [{ deadline: "asc" }, { roundNumber: "asc" }],
  });

  if (!round) {
    throw new AppError(404, "No current editable round found.");
  }

  const fantasyTeam = await prisma.fantasyTeam.findUnique({
    where: {
      userId_seasonId: {
        userId: requestingUserId,
        seasonId: activeSeason.id,
      },
    },
  });

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
  }

  const lineup = await prisma.fantasyLineup.findUnique({
    where: {
      fantasyTeamId_roundId: {
        fantasyTeamId: fantasyTeam.id,
        roundId: round.id,
      },
    },
  });

  const previousLineup = lineup
    ? null
    : await findPreviousLineup(fantasyTeam.id, round);

  const lineupWithDetails = lineup
    ? await getLineupWithDetails(lineup.id)
    : null;

  return {
    fantasyTeam: {
      id: fantasyTeam.id,
      name: fantasyTeam.name,
    },
    round: {
      id: round.id,
      roundNumber: round.roundNumber,
      name: round.name,
      deadline: round.deadline,
      status: round.status,
      ...getRoundDeadlineState(round),
    },
    lineup: lineupWithDetails ? toLineupResponse(lineupWithDetails) : null,
    suggestedLineup: previousLineup ? toLineupResponse(previousLineup) : null,
  };
}

export async function getMyFantasyTeamStatus(
  requestingUserId: string,
): Promise<FantasyTeamStatusResponse> {
  const activeSeason = await prisma.season.findFirst({
    where: { active: true },
    orderBy: { startDate: "desc" },
  });

  if (!activeSeason) {
    return {
      round: null,
      fantasyTeam: null,
      squad: {
        value: 0,
        budget: FANTASY_RULES.squad.budget,
        remainingBudget: FANTASY_RULES.squad.budget,
      },
      transfers: {
        freeTransfers: FANTASY_RULES.transfers.freePerRound,
        transfersMade: 0,
        extraTransfers: 0,
        transferPenalty: 0,
      },
      chips: null,
    };
  }

  const round =
    (await prisma.round.findFirst({
      where: {
        seasonId: activeSeason.id,
        status: "UPCOMING",
        deadline: { gt: new Date() },
      },
      orderBy: [{ deadline: "asc" }, { roundNumber: "asc" }],
    })) ??
    (await prisma.round.findFirst({
      where: { seasonId: activeSeason.id },
      orderBy: [{ roundNumber: "desc" }, { deadline: "desc" }],
    }));

  const fantasyTeam = await prisma.fantasyTeam.findUnique({
    where: {
      userId_seasonId: {
        userId: requestingUserId,
        seasonId: activeSeason.id,
      },
    },
  });

  if (!fantasyTeam) {
    return {
      round: round
        ? {
            id: round.id,
            roundNumber: round.roundNumber,
            name: round.name,
            deadline: round.deadline,
            status: round.status,
            ...getRoundDeadlineState(round),
          }
        : null,
      fantasyTeam: null,
      squad: {
        value: 0,
        budget: FANTASY_RULES.squad.budget,
        remainingBudget: FANTASY_RULES.squad.budget,
      },
      transfers: {
        freeTransfers: FANTASY_RULES.transfers.freePerRound,
        transfersMade: 0,
        extraTransfers: 0,
        transferPenalty: 0,
      },
      chips: null,
    };
  }

  const lineup =
    round
      ? await prisma.fantasyLineup.findUnique({
          where: {
            fantasyTeamId_roundId: {
              fantasyTeamId: fantasyTeam.id,
              roundId: round.id,
            },
          },
        })
      : null;
  const previousLineup =
    round && !lineup ? await findPreviousLineup(fantasyTeam.id, round) : null;
  const lineupWithDetails = lineup ? await getLineupWithDetails(lineup.id) : null;
  const responseLineup = lineupWithDetails
    ? toLineupResponse(lineupWithDetails)
    : previousLineup
      ? toLineupResponse(previousLineup)
      : null;
  const squadValue = responseLineup?.squadValue ?? 0;
  const transfers = responseLineup?.transfers ?? {
    transfersMade: 0,
    freeTransfers: FANTASY_RULES.transfers.freePerRound,
    extraTransfers: 0,
    transferPenalty: 0,
    playersIn: [],
    playersOut: [],
    wildcardActive: false,
  };
  const chips = round
    ? await getChipStatus(fantasyTeam.id, fantasyTeam.seasonId, round.id)
    : await getChipStatus(fantasyTeam.id, fantasyTeam.seasonId);

  return {
    round: round
      ? {
          id: round.id,
          roundNumber: round.roundNumber,
          name: round.name,
          deadline: round.deadline,
          status: round.status,
          ...getRoundDeadlineState(round),
        }
      : null,
    fantasyTeam: {
      id: fantasyTeam.id,
      name: fantasyTeam.name,
    },
    squad: {
      value: squadValue,
      budget: FANTASY_RULES.squad.budget,
      remainingBudget: FANTASY_RULES.squad.budget - squadValue,
    },
    transfers: {
      freeTransfers: transfers.freeTransfers,
      transfersMade: transfers.transfersMade,
      extraTransfers: transfers.extraTransfers,
      transferPenalty: transfers.transferPenalty,
    },
    chips,
  };
}
