import { Router } from "express";
import {
  activateChipController,
  removeChipController,
} from "../controllers/chip.controller.js";
import {
  createFantasyTeamController,
  getFantasyTeamController,
  getFantasyTeamLineupsController,
  getMyFantasyTeamController,
} from "../controllers/fantasyTeam.controller.js";
import { getMyFantasyTeamStatusController } from "../controllers/lineup.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const fantasyTeamsRouter = Router();

fantasyTeamsRouter.use(requireAuth);

fantasyTeamsRouter.post("/", createFantasyTeamController);
fantasyTeamsRouter.get("/me", getMyFantasyTeamController);
fantasyTeamsRouter.get("/me/status", getMyFantasyTeamStatusController);
fantasyTeamsRouter.post(
  "/:teamId/rounds/:roundId/chip",
  activateChipController,
);
fantasyTeamsRouter.delete(
  "/:teamId/rounds/:roundId/chip",
  removeChipController,
);
fantasyTeamsRouter.get("/:id/lineups", getFantasyTeamLineupsController);
fantasyTeamsRouter.get("/:id", getFantasyTeamController);
