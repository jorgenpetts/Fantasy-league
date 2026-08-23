import type { Request, Response } from "express";
import {
  createSeason,
  getCurrentSeason,
  listSeasons,
  updateSeason,
} from "../services/season.service.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createSeasonSchema,
  updateSeasonSchema,
} from "../validators/season.validator.js";

export async function getSeasons(_req: Request, res: Response) {
  const seasons = await listSeasons();

  res.status(200).json({ seasons });
}

export async function getCurrentSeasonController(_req: Request, res: Response) {
  const season = await getCurrentSeason();

  res.status(200).json({ season });
}

export async function createSeasonController(req: Request, res: Response) {
  const input = createSeasonSchema.parse(req.body);
  const season = await createSeason(input);

  res.status(201).json({ season });
}

export async function updateSeasonController(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const input = updateSeasonSchema.parse(req.body);
  const season = await updateSeason(id, input);

  res.status(200).json({ season });
}
