import { z } from "zod";

export const createFantasyTeamSchema = z.object({
  name: z.string().trim().min(1).max(80),
  seasonId: z.string().trim().min(1),
});

export const fantasyTeamMeQuerySchema = z.object({
  seasonId: z.string().trim().min(1).optional(),
});

export const fantasyTeamLineupsQuerySchema = z.object({
  roundId: z.string().trim().min(1).optional(),
});

export type CreateFantasyTeamInput = z.infer<typeof createFantasyTeamSchema>;
export type FantasyTeamMeQueryInput = z.infer<typeof fantasyTeamMeQuerySchema>;
export type FantasyTeamLineupsQueryInput = z.infer<
  typeof fantasyTeamLineupsQuerySchema
>;
