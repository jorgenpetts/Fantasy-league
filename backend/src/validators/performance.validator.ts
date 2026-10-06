import { z } from "zod";

export const roundIdParamSchema = z.object({
  roundId: z.string().trim().min(1),
});

export const playerPerformanceParamsSchema = z.object({
  roundId: z.string().trim().min(1),
  playerId: z.string().trim().min(1),
});

export const playerPerformancesQuerySchema = z.object({
  seasonId: z.string().trim().min(1).optional(),
  roundId: z.string().trim().min(1).optional(),
});

export const performanceStatsSchema = z
  .object({
    didBat: z.boolean().default(false),
    notOut: z.boolean().default(false),
    runs: z.coerce.number().int().min(0).default(0),
    ballsFaced: z.coerce.number().int().min(0).default(0),
    wickets: z.coerce.number().int().min(0).default(0),
    runsConceded: z.coerce.number().int().min(0).default(0),
    ballsBowled: z.coerce.number().int().min(0).default(0),
    maidens: z.coerce.number().int().min(0).default(0),
    catches: z.coerce.number().int().min(0).default(0),
    droppedCatches: z.coerce.number().int().min(0).default(0),
    stumpings: z.coerce.number().int().min(0).default(0),
    runOuts: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const upsertPerformanceSchema = performanceStatsSchema;

export const bulkUpsertPerformancesSchema = z.object({
  performances: z
    .array(
      performanceStatsSchema.extend({
        playerId: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export type PerformanceStatsInput = z.infer<typeof performanceStatsSchema>;
export type UpsertPerformanceInput = z.infer<typeof upsertPerformanceSchema>;
export type BulkUpsertPerformancesInput = z.infer<
  typeof bulkUpsertPerformancesSchema
>;
export type PlayerPerformancesQueryInput = z.infer<
  typeof playerPerformancesQuerySchema
>;
