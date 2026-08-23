import { PlayerPosition } from "@prisma/client";
import { z } from "zod";
import { optionalBooleanQuerySchema } from "./common.validator.js";

const playerBaseSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  position: z.enum(PlayerPosition),
  price: z.coerce.number().int().positive(),
  active: z.boolean().optional().default(true),
});

export const createPlayerSchema = playerBaseSchema;

export const updatePlayerSchema = playerBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const playerQuerySchema = z.object({
  position: z.enum(PlayerPosition).optional(),
  active: optionalBooleanQuerySchema,
  search: z.string().trim().min(1).max(120).optional(),
  seasonId: z.string().trim().min(1).optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;
export type PlayerQueryInput = z.infer<typeof playerQuerySchema>;
