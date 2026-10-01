export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  dashboard: ["dashboard"] as const,
  fantasyRules: ["fantasy-rules"] as const,
  fantasyTeam: {
    me: ["fantasy-team", "me"] as const,
    meSeason: (seasonId?: string) =>
      ["fantasy-team", "me", "season", seasonId] as const,
    status: ["fantasy-team", "me", "status"] as const,
    detail: (teamId?: string) => ["fantasy-team", teamId] as const,
    lineups: (teamId?: string) =>
      ["fantasy-team", teamId, "lineups"] as const,
  },
  lineups: {
    current: ["lineups", "me", "current"] as const,
    teamRound: (teamId?: string, roundId?: string) =>
      ["lineups", "team-round", teamId, roundId] as const,
  },
  seasons: {
    all: ["seasons", "all"] as const,
    current: ["seasons", "current"] as const,
    rounds: (seasonId?: string) => ["seasons", seasonId, "rounds"] as const,
  },
  players: (params?: unknown) => ["players", params] as const,
  player: (id: string) => ["player", id] as const,
  playerPerformances: (id: string, params?: unknown) =>
    ["player", id, "performances", params] as const,
  roundPerformances: (roundId?: string) =>
    ["round", roundId, "performances"] as const,
  leaderboard: (params?: unknown) => ["leaderboard", params] as const,
};
