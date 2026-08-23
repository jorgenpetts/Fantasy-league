import { Router } from "express";
import { getRoundPerformances } from "../controllers/performance.controller.js";
import {
  getCurrentRoundController,
  getRound,
  getRounds,
} from "../controllers/round.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const roundsRouter = Router();

roundsRouter.use(requireAuth);

roundsRouter.get("/", getRounds);
roundsRouter.get("/current", getCurrentRoundController);
roundsRouter.get("/:roundId/performances", getRoundPerformances);
roundsRouter.get("/:id", getRound);
