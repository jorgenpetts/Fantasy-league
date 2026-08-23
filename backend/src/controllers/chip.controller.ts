import type { Request, Response } from "express";
import { activateChip, removeChip } from "../services/chip.service.js";
import {
  activateChipSchema,
  chipParamsSchema,
} from "../validators/chip.validator.js";

export async function activateChipController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const { teamId, roundId } = chipParamsSchema.parse(req.params);
  const { chipType } = activateChipSchema.parse(req.body);
  const chipUsage = await activateChip(teamId, roundId, userId, chipType);

  res.status(200).json({ chipUsage });
}

export async function removeChipController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const { teamId, roundId } = chipParamsSchema.parse(req.params);
  await removeChip(teamId, roundId, userId);

  res.status(200).json({ message: "Chip removed." });
}
