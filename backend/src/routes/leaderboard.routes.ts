import { Router } from "express";
import { getLeaderboardController } from "../controllers/leaderboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth);

leaderboardRouter.get("/", getLeaderboardController);
