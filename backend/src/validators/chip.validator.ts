import { ChipType } from "@prisma/client";
import { z } from "zod";

export const chipParamsSchema = z.object({
  teamId: z.string().trim().min(1),
  roundId: z.string().trim().min(1),
});

export const activateChipSchema = z.object({
  chipType: z.enum(ChipType),
});
