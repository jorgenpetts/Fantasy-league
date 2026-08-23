import type { Request, Response } from "express";
import { getLeaderboard } from "../services/leaderboard.service.js";
import { leaderboardQuerySchema } from "../validators/leaderboard.validator.js";

export async function getLeaderboardController(req: Request, res: Response) {
  const query = leaderboardQuerySchema.parse(req.query);
  const leaderboard = await getLeaderboard(query);

  res.status(200).json({ leaderboard });
}
