import { Router } from "express";
import {
  createPlayerController,
  updatePlayerController,
} from "../../controllers/player.controller.js";

export const adminPlayersRouter = Router();

adminPlayersRouter.post("/", createPlayerController);
adminPlayersRouter.put("/:id", updatePlayerController);
