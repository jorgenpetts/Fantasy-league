import { Router } from "express";
import { getPlayerPerformances } from "../controllers/performance.controller.js";
import { getPlayer, getPlayers } from "../controllers/player.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const playersRouter = Router();

playersRouter.use(requireAuth);

playersRouter.get("/", getPlayers);
playersRouter.get("/:id/performances", getPlayerPerformances);
playersRouter.get("/:id", getPlayer);
