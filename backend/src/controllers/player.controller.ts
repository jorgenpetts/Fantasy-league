import type { Request, Response } from "express";
import {
  createPlayer,
  getPlayerById,
  listPlayers,
  updatePlayer,
} from "../services/player.service.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createPlayerSchema,
  playerQuerySchema,
  updatePlayerSchema,
} from "../validators/player.validator.js";

export async function getPlayers(req: Request, res: Response) {
  const query = playerQuerySchema.parse(req.query);
  const players = await listPlayers(query);

  res.status(200).json({ players });
}

export async function getPlayer(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const query = playerQuerySchema.pick({ seasonId: true }).parse(req.query);
  const player = await getPlayerById(id, query.seasonId);

  res.status(200).json({ player });
}

export async function createPlayerController(req: Request, res: Response) {
  const input = createPlayerSchema.parse(req.body);
  const player = await createPlayer(input);

  res.status(201).json({ player });
}

export async function updatePlayerController(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const input = updatePlayerSchema.parse(req.body);
  const player = await updatePlayer(id, input);

  res.status(200).json({ player });
}
