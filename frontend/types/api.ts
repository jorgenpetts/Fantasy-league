export type UserRole = "USER" | "ADMIN";
export type PlayerPosition =
  | "WICKET_KEEPER"
  | "BATTER"
  | "ALL_ROUNDER"
  | "BOWLER";
export type RoundStatus = "UPCOMING" | "LOCKED" | "COMPLETED";
export type ChipType = "WILDCARD" | "TRIPLE_CAPTAIN";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Round = {
  id: string;
  seasonId: string;
  roundNumber: number;
  name: string;
  deadline: string;
  status: RoundStatus;
  season?: Season;
  isLocked: boolean;
  canEdit: boolean;
};

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  price: number;
  active: boolean;
  totalFantasyPoints?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PlayerPerformance = {
  id: string;
  playerId: string;
  roundId: string;
  didBat: boolean;
  runs: number;
  ballsFaced: number;
  wickets: number;
  runsConceded: number;
  ballsBowled: number;
  catches: number;
  droppedCatches: number;
  stumpings: number;
  runOuts: number;
  fantasyPoints: number;
  round: Round;
  player?: Player;
};

export type LineupPlayer = Player;

export type LineupTransferStatus = {
  transfersMade: number;
  freeTransfers: number;
  extraTransfers: number;
  transferPenalty: number;
  playersIn: string[];
  playersOut: string[];
  wildcardActive: boolean;
};

export type FantasyLineup = {
  id: string;
  fantasyTeam: {
    id: string;
    name: string;
    managerName: string;
  };
  round: Pick<
    Round,
    "id" | "roundNumber" | "name" | "deadline" | "status" | "isLocked" | "canEdit"
  >;
  captainId: string;
  players: LineupPlayer[];
  squadValue: number;
  grossPoints: number;
  roundPoints: number;
  transfers: LineupTransferStatus;
  activeChip: ChipType | null;
  createdAt: string;
};

export type HiddenLineup = {
  team: {
    id: string;
    name: string;
    managerName: string;
  };
  round: Pick<
    Round,
    "id" | "roundNumber" | "name" | "deadline" | "status" | "isLocked" | "canEdit"
  >;
  lineupLockedForViewing: true;
};

export type FantasyTeam = {
  id: string;
  name: string;
  managerName: string;
  season: Season;
  createdAt: string;
  updatedAt: string;
  lineups?: Array<FantasyLineup | HiddenLineup>;
};

export type CurrentUserLineup = {
  fantasyTeam: {
    id: string;
    name: string;
  };
  round: Pick<
    Round,
    "id" | "roundNumber" | "name" | "deadline" | "status" | "isLocked" | "canEdit"
  >;
  lineup: FantasyLineup | null;
  suggestedLineup: FantasyLineup | null;
  previousLineup: FantasyLineup | null;
};

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

export type FantasyTeamStatus = {
  round: CurrentUserLineup["round"] | null;
  fantasyTeam: {
    id: string;
    name: string;
  } | null;
  squad: {
    value: number;
    budget: number;
    remainingBudget: number;
  };
  transfers: Pick<
    LineupTransferStatus,
    "freeTransfers" | "transfersMade" | "extraTransfers" | "transferPenalty"
  >;
  chips: ChipStatus | null;
};

export type FantasyRules = {
  squad: {
    size: number;
    budget: number;
    positions: Record<PlayerPosition, number>;
  };
  transfers: {
    freePerRound: number;
    extraTransferPenalty: number;
  };
  chips: {
    perSeason: Record<ChipType, number>;
  };
  scoring: Record<string, number>;
};

export type LeaderboardEntry = {
  rank: number;
  fantasyTeamId: string;
  fantasyTeamName: string;
  managerName: string;
  roundPoints?: number;
  totalPoints: number;
};

export type Leaderboard = {
  seasonId: string;
  roundId: string | null;
  rankingStyle: "competition";
  entries: LeaderboardEntry[];
};

export type DashboardSummary = {
  season: Season | null;
  currentRound: Round | null;
  fantasyTeam: {
    id: string;
    name: string;
  } | null;
  lineup: FantasyLineup | null;
  roundPoints: number;
  totalPoints: number;
  overallRank: number | null;
  squad: {
    value: number;
    budget: number;
    remainingBudget: number;
  };
  transfers: Pick<
    LineupTransferStatus,
    "freeTransfers" | "transfersMade" | "extraTransfers" | "transferPenalty"
  >;
  chips: ChipStatus | null;
  topPerformers: Array<{
    playerId: string;
    firstName: string;
    lastName: string;
    position: PlayerPosition;
    fantasyPoints: number;
  }>;
  leaderboardPreview: LeaderboardEntry[];
};
