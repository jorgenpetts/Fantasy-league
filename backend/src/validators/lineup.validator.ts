import { z } from "zod";

export const lineupParamsSchema = z.object({
  teamId: z.string().trim().min(1),
  roundId: z.string().trim().min(1),
});

const manualLineupSchema = z
  .object({
    playerIds: z.array(z.string().trim().min(1)).min(1),
    captainId: z.string().trim().min(1),
  })
  .superRefine((value, context) => {
    const uniquePlayerIds = new Set(value.playerIds);

    if (uniquePlayerIds.size !== value.playerIds.length) {
      context.addIssue({
        code: "custom",
        message: "A player cannot be selected more than once.",
        path: ["playerIds"],
      });
    }

    if (!uniquePlayerIds.has(value.captainId)) {
      context.addIssue({
        code: "custom",
        message: "Captain must be one of the selected players.",
        path: ["captainId"],
      });
    }
  });

const clonePreviousLineupSchema = z.object({
  usePreviousLineup: z.literal(true),
});

export const saveLineupSchema = z.union([
  manualLineupSchema,
  clonePreviousLineupSchema,
]);

export type ManualLineupInput = z.infer<typeof manualLineupSchema>;
export type SaveLineupInput = z.infer<typeof saveLineupSchema>;
