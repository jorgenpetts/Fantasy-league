import { Router } from "express";
import {
  getLineupController,
  getMyCurrentLineupController,
  saveLineupController,
} from "../controllers/lineup.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const lineupsRouter = Router();

lineupsRouter.use(requireAuth);

lineupsRouter.get("/me/current", getMyCurrentLineupController);
lineupsRouter.get("/:teamId/:roundId", getLineupController);
lineupsRouter.put("/:teamId/:roundId", saveLineupController);
