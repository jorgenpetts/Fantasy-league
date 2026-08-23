import { Router } from "express";
import {
  bulkUpsertRoundPerformances,
  getAdminRoundPerformances,
  recalculateRoundController,
  upsertPlayerPerformance,
} from "../../controllers/performance.controller.js";
import {
  createRoundController,
  updateRoundController,
} from "../../controllers/round.controller.js";

export const adminRoundsRouter = Router();

adminRoundsRouter.post("/", createRoundController);
adminRoundsRouter.get("/:roundId/performances", getAdminRoundPerformances);
adminRoundsRouter.put("/:roundId/performances", bulkUpsertRoundPerformances);
adminRoundsRouter.put(
  "/:roundId/performances/:playerId",
  upsertPlayerPerformance,
);
adminRoundsRouter.post("/:roundId/recalculate", recalculateRoundController);
adminRoundsRouter.put("/:id", updateRoundController);
