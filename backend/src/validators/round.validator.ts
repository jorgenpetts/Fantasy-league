import { RoundStatus } from "@prisma/client";
import { z } from "zod";
import { dateStringSchema } from "./common.validator.js";

const roundBaseSchema = z.object({
  seasonId: z.string().trim().min(1),
  roundNumber: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  deadline: dateStringSchema,
  status: z.enum(RoundStatus).optional().default(RoundStatus.UPCOMING),
});

export const createRoundSchema = roundBaseSchema;

export const updateRoundSchema = roundBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const roundQuerySchema = z.object({
  seasonId: z.string().trim().min(1).optional(),
  status: z.enum(RoundStatus).optional(),
});

export type CreateRoundInput = z.infer<typeof createRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
export type RoundQueryInput = z.infer<typeof roundQuerySchema>;
