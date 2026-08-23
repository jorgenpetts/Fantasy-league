import type { Request, Response } from "express";
import { FANTASY_RULES } from "../config/fantasyRules.js";

export function getFantasyRules(_req: Request, res: Response) {
  res.status(200).json({ fantasyRules: FANTASY_RULES });
}
