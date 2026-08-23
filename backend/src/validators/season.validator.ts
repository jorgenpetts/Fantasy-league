import { z } from "zod";
import { dateStringSchema } from "./common.validator.js";

const seasonBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  active: z.boolean().optional().default(false),
});

function validateSeasonDateRange<T extends { startDate?: Date; endDate?: Date }>(
  value: T,
  context: z.RefinementCtx,
) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({
      code: "custom",
      message: "endDate must be on or after startDate.",
      path: ["endDate"],
    });
  }
}

export const createSeasonSchema = seasonBaseSchema.superRefine(
  validateSeasonDateRange,
);

export const updateSeasonSchema = seasonBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  })
  .superRefine(validateSeasonDateRange);

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;
