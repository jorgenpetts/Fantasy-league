import type { Request, Response } from "express";
import {
  getLineup,
  getMyFantasyTeamStatus,
  getMyCurrentLineup,
  saveLineup,
} from "../services/lineup.service.js";
import {
  lineupParamsSchema,
  saveLineupSchema,
} from "../validators/lineup.validator.js";

export async function getLineupController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const { teamId, roundId } = lineupParamsSchema.parse(req.params);
  const lineup = await getLineup(teamId, roundId, userId);

  res.status(200).json({ lineup });
}

export async function saveLineupController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const { teamId, roundId } = lineupParamsSchema.parse(req.params);
  const input = saveLineupSchema.parse(req.body);
  const lineup = await saveLineup(teamId, roundId, userId, input);

  res.status(200).json({ lineup });
}

export async function getMyCurrentLineupController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const currentLineup = await getMyCurrentLineup(userId);

  res.status(200).json(currentLineup);
}

export async function getMyFantasyTeamStatusController(
  req: Request,
  res: Response,
) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const status = await getMyFantasyTeamStatus(userId);

  res.status(200).json(status);
}
