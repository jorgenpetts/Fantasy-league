import { z } from "zod";

export const leaderboardQuerySchema = z.object({
  seasonId: z.string().trim().min(1).optional(),
  roundId: z.string().trim().min(1).optional(),
});

export type LeaderboardQueryInput = z.infer<typeof leaderboardQuerySchema>;
