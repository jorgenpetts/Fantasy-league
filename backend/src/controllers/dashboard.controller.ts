import type { Request, Response } from "express";
import { getDashboard } from "../services/dashboard.service.js";

export async function getDashboardController(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const dashboard = await getDashboard(userId);

  res.status(200).json({ dashboard });
}
