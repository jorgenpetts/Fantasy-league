import { Router } from "express";
import {
  getCurrentSeasonController,
  getSeasons,
} from "../controllers/season.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const seasonsRouter = Router();

seasonsRouter.use(requireAuth);

seasonsRouter.get("/", getSeasons);
seasonsRouter.get("/current", getCurrentSeasonController);
