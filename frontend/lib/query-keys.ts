export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  dashboard: ["dashboard"] as const,
  fantasyRules: ["fantasy-rules"] as const,
  players: (params?: unknown) => ["players", params] as const,
  leaderboard: (params?: unknown) => ["leaderboard", params] as const,
};
