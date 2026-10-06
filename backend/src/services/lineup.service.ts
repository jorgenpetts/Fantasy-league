import {
  ChipType,
  Prisma,
  type CricketPlayer,
  type FantasyTeam,
  type Round,
  type User,
} from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import { AppError } from "../utils/AppError.js";
import { canEditRound, getRoundDeadlineState } from "../utils/roundDeadline.js";
import { calculateSquadValue } from "../utils/squadValue.js";
import { getActiveChipForRound, getChipStatus, type ChipStatus } from "./chip.service.js";
import { validateSquadPlayers } from "./squadValidation.service.js";
import { calculateTransfers } from "./transfer.service.js";
import type { FantasyTeamLineupsQueryInput } from "../validators/fantasyTeam.validator.js";
import type {
  ManualLineupInput,
  SaveLineupInput,
} from "../validators/lineup.validator.js";

type PlayerSelection = Pick<
  CricketPlayer,
  "id" | "firstName" | "lastName" | "position" | "price" | "active"
>;

const lineupDetailsInclude = {
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
    orderBy: { player: { lastName: "asc" as const } },
  },
  transferSummary: {
    select: {
      playersIn: true,
      playersOut: true,
      wildcardActive: true,
    },
  },
} satisfies Prisma.FantasyLineupInclude;

type LineupWithDetails = Prisma.FantasyLineupGetPayload<{
  include: typeof lineupDetailsInclude;
}>;

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
  previousLineup: LineupResponse | null;
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
  // An early administrative lock must not reveal selections before the deadline.
  return fantasyTeam.userId === requestingUserId || round.deadline <= new Date();
}

function isManualLineupInput(input: SaveLineupInput): input is ManualLineupInput {
  return "playerIds" in input;
}

async function getFantasyTeamAndRound(teamId: string, roundId: string) {
  const [fantasyTeam, round] = await Promise.all([
    prisma.fantasyTeam.findUnique({
      where: { id: teamId },
      relationLoadStrategy: "join",
      include: {
        user: { select: { id: true, name: true } },
        season: true,
      },
    }),
    prisma.round.findUnique({
      where: { id: roundId },
      relationLoadStrategy: "join",
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

async function getLineupByTeamAndRoundWithDetails(
  fantasyTeamId: string,
  roundId: string,
) {
  return prisma.fantasyLineup.findUnique({
    where: {
      fantasyTeamId_roundId: { fantasyTeamId, roundId },
    },
    relationLoadStrategy: "join",
    include: lineupDetailsInclude,
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
    relationLoadStrategy: "join",
    include: lineupDetailsInclude,
    orderBy: { round: { roundNumber: "desc" } },
  });
}

async function findPreviousLineupSelection(
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
    select: {
      captainId: true,
      players: { select: { playerId: true } },
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

  const previousLineupPromise = findPreviousLineupSelection(teamId, round);
  const activeChipPromise = getActiveChipForRound(teamId, roundId);
  let resolvedInput: ManualLineupInput;

  if (isManualLineupInput(input)) {
    resolvedInput = input;
  } else {
    const previousLineup = await previousLineupPromise;

    if (!previousLineup) {
      throw new AppError(404, "No previous lineup found to copy.");
    }

    resolvedInput = {
      playerIds: previousLineup.players.map(({ playerId }) => playerId),
      captainId: previousLineup.captainId,
    };
  }

  const [{ playerIds }, previousLineup, activeChip] = await Promise.all([
    validateSelectedPlayers(resolvedInput),
    previousLineupPromise,
    activeChipPromise,
  ]);
  const previousPlayerIds = previousLineup
    ? previousLineup.players.map(({ playerId }) => playerId)
    : [];
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

  const transferSummaryData = {
    fantasyTeamId: teamId,
    roundId,
    playersIn: transferCalculation.playersIn,
    playersOut: transferCalculation.playersOut,
    transfersMade: transferCalculation.transfersMade,
    freeTransfers: transferCalculation.freeTransfers,
    transferPenalty: transferCalculation.transferPenalty,
    wildcardActive: transferCalculation.wildcardActive,
  };
  const lineup = await prisma.fantasyLineup.upsert({
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
      players: {
        deleteMany: {},
        create: playerIds.map((playerId) => ({ playerId })),
      },
      transferSummary: {
        upsert: {
          update: transferSummaryData,
          create: transferSummaryData,
        },
      },
    },
    create: {
      fantasyTeamId: teamId,
      roundId,
      captainId: resolvedInput.captainId,
      transfersMade: transferCalculation.transfersMade,
      freeTransfers: transferCalculation.freeTransfers,
      transferPenalty: transferCalculation.transferPenalty,
      players: {
        create: playerIds.map((playerId) => ({ playerId })),
      },
      transferSummary: {
        create: transferSummaryData,
      },
    },
    include: lineupDetailsInclude,
  });

  return toLineupResponse(lineup);
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

  const lineupWithDetails = await getLineupByTeamAndRoundWithDetails(
    teamId,
    roundId,
  );

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
    relationLoadStrategy: "join",
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
  const now = new Date();
  const [round, fantasyTeam] = await Promise.all([
    prisma.round.findFirst({
      where: {
        season: { active: true },
        status: "UPCOMING",
        deadline: { gt: now },
      },
      orderBy: [
        { season: { startDate: "desc" } },
        { deadline: "asc" },
        { roundNumber: "asc" },
      ],
    }),
    prisma.fantasyTeam.findFirst({
      where: {
        userId: requestingUserId,
        season: { active: true },
      },
      orderBy: { season: { startDate: "desc" } },
    }),
  ]);

  if (!round) {
    throw new AppError(404, "No current editable round found.");
  }

  if (!fantasyTeam) {
    throw new AppError(404, "Fantasy team not found.");
  }

  if (fantasyTeam.seasonId !== round.seasonId) {
    throw new AppError(404, "Fantasy team not found for the active season.");
  }

  const [lineupWithDetails, previousLineup] = await Promise.all([
    getLineupByTeamAndRoundWithDetails(fantasyTeam.id, round.id),
    findPreviousLineup(fantasyTeam.id, round),
  ]);

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
    suggestedLineup:
      !lineupWithDetails && previousLineup
        ? toLineupResponse(previousLineup)
        : null,
    previousLineup: previousLineup ? toLineupResponse(previousLineup) : null,
  };
}

export async function getMyFantasyTeamStatus(
  requestingUserId: string,
): Promise<FantasyTeamStatusResponse> {
  const now = new Date();
  const [activeSeason, activeRounds, activeFantasyTeam] = await Promise.all([
    prisma.season.findFirst({
      where: { active: true },
      orderBy: { startDate: "desc" },
      select: { id: true },
    }),
    prisma.round.findMany({
      where: { season: { active: true } },
      orderBy: [{ roundNumber: "desc" }, { deadline: "desc" }],
    }),
    prisma.fantasyTeam.findFirst({
      where: {
        userId: requestingUserId,
        season: { active: true },
      },
      orderBy: { season: { startDate: "desc" } },
    }),
  ]);

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

  const seasonRounds = activeRounds.filter(
    (round) => round.seasonId === activeSeason.id,
  );
  const round =
    seasonRounds
      .filter(
        (candidate) =>
          candidate.status === "UPCOMING" && candidate.deadline > now,
      )
      .sort(
        (left, right) =>
          left.deadline.getTime() - right.deadline.getTime() ||
          left.roundNumber - right.roundNumber,
      )[0] ?? seasonRounds[0] ?? null;
  const fantasyTeam =
    activeFantasyTeam?.seasonId === activeSeason.id
      ? activeFantasyTeam
      : null;

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

  const [lineupWithDetails, previousLineup, chips] = await Promise.all([
    round
      ? getLineupByTeamAndRoundWithDetails(fantasyTeam.id, round.id)
      : Promise.resolve(null),
    round
      ? findPreviousLineup(fantasyTeam.id, round)
      : Promise.resolve(null),
    getChipStatus(
      fantasyTeam.id,
      fantasyTeam.seasonId,
      round?.id,
    ),
  ]);
  const currentLineupResponse = lineupWithDetails
    ? toLineupResponse(lineupWithDetails)
    : null;
  const suggestedLineupResponse = previousLineup
    ? toLineupResponse(previousLineup)
    : null;
  const squadValue =
    currentLineupResponse?.squadValue ??
    suggestedLineupResponse?.squadValue ??
    0;
  const transfers = currentLineupResponse?.transfers ?? {
    transfersMade: 0,
    freeTransfers: FANTASY_RULES.transfers.freePerRound,
    extraTransfers: 0,
    transferPenalty: 0,
    playersIn: [],
    playersOut: [],
    wildcardActive: false,
  };
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
