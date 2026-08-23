import { UserRole } from "@prisma/client";
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { adminPlayersRouter } from "./players.routes.js";
import { adminRoundsRouter } from "./rounds.routes.js";
import { adminSeasonsRouter } from "./seasons.routes.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole(UserRole.ADMIN));

adminRouter.use("/seasons", adminSeasonsRouter);
adminRouter.use("/players", adminPlayersRouter);
adminRouter.use("/rounds", adminRoundsRouter);
