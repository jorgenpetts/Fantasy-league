import type { Request, Response } from "express";
import {
  createRound,
  getCurrentRound,
  getRoundById,
  listRounds,
  updateRound,
} from "../services/round.service.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createRoundSchema,
  roundQuerySchema,
  updateRoundSchema,
} from "../validators/round.validator.js";

export async function getRounds(req: Request, res: Response) {
  const query = roundQuerySchema.parse(req.query);
  const rounds = await listRounds(query);

  res.status(200).json({ rounds });
}

export async function getCurrentRoundController(_req: Request, res: Response) {
  const round = await getCurrentRound();

  res.status(200).json({ round });
}

export async function getRound(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const round = await getRoundById(id);

  res.status(200).json({ round });
}

export async function createRoundController(req: Request, res: Response) {
  const input = createRoundSchema.parse(req.body);
  const round = await createRound(input);

  res.status(201).json({ round });
}

export async function updateRoundController(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const input = updateRoundSchema.parse(req.body);
  const round = await updateRound(id, input);

  res.status(200).json({ round });
}
