import { Router } from "express";
import {
  createSeasonController,
  updateSeasonController,
} from "../../controllers/season.controller.js";

export const adminSeasonsRouter = Router();

adminSeasonsRouter.post("/", createSeasonController);
adminSeasonsRouter.put("/:id", updateSeasonController);
