import type { Request, Response } from "express";
import {
  bulkUpsertPerformances,
  listPlayerPerformances,
  listRoundPerformances,
  recalculateRound,
  upsertPerformance,
} from "../services/performance.service.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  bulkUpsertPerformancesSchema,
  playerPerformanceParamsSchema,
  playerPerformancesQuerySchema,
  roundIdParamSchema,
  upsertPerformanceSchema,
} from "../validators/performance.validator.js";

export async function getAdminRoundPerformances(req: Request, res: Response) {
  const { roundId } = roundIdParamSchema.parse(req.params);
  const performances = await listRoundPerformances(roundId);

  res.status(200).json({ performances });
}

export async function getRoundPerformances(req: Request, res: Response) {
  const { roundId } = roundIdParamSchema.parse(req.params);
  const performances = await listRoundPerformances(roundId);

  res.status(200).json({ performances });
}

export async function getPlayerPerformances(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const query = playerPerformancesQuerySchema.parse(req.query);
  const performances = await listPlayerPerformances(id, query);

  res.status(200).json({ performances });
}

export async function upsertPlayerPerformance(req: Request, res: Response) {
  const { roundId, playerId } = playerPerformanceParamsSchema.parse(req.params);
  const input = upsertPerformanceSchema.parse(req.body);
  const result = await upsertPerformance(roundId, playerId, input);

  res.status(200).json(result);
}

export async function bulkUpsertRoundPerformances(req: Request, res: Response) {
  const { roundId } = roundIdParamSchema.parse(req.params);
  const input = bulkUpsertPerformancesSchema.parse(req.body);
  const recalculateSummary = await bulkUpsertPerformances(roundId, input);

  res.status(200).json(recalculateSummary);
}

export async function recalculateRoundController(req: Request, res: Response) {
  const { roundId } = roundIdParamSchema.parse(req.params);
  const recalculateSummary = await recalculateRound(roundId);

  res.status(200).json(recalculateSummary);
}
