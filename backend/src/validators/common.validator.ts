import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const dateStringSchema = z
  .string()
  .trim()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const optionalBooleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();
