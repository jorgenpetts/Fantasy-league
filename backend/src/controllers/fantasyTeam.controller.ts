import type { Request, Response } from "express";
import {
  createFantasyTeam,
  getFantasyTeamById,
  getFantasyTeamLineups,
  getMyFantasyTeam,
} from "../services/fantasyTeam.service.js";
import { idParamSchema } from "../validators/common.validator.js";
import {
  createFantasyTeamSchema,
  fantasyTeamLineupsQuerySchema,
  fantasyTeamMeQuerySchema,
} from "../validators/fantasyTeam.validator.js";

export async function createFantasyTeamController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const input = createFantasyTeamSchema.parse(req.body);
  const fantasyTeam = await createFantasyTeam(userId, input);

  res.status(201).json({ fantasyTeam });
}

export async function getMyFantasyTeamController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const query = fantasyTeamMeQuerySchema.parse(req.query);
  const fantasyTeam = await getMyFantasyTeam(userId, query);

  res.status(200).json({ fantasyTeam });
}

export async function getFantasyTeamController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const { id } = idParamSchema.parse(req.params);
  const fantasyTeam = await getFantasyTeamById(id, userId);

  res.status(200).json({ fantasyTeam });
}

export async function getFantasyTeamLineupsController(
  req: Request,
  res: Response,
) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const { id } = idParamSchema.parse(req.params);
  const query = fantasyTeamLineupsQuerySchema.parse(req.query);
  const lineups = await getFantasyTeamLineups(id, userId, query);

  res.status(200).json({ lineups });
}
