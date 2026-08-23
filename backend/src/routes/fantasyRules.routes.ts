import { Router } from "express";
import { getFantasyRules } from "../controllers/fantasyRules.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const fantasyRulesRouter = Router();

fantasyRulesRouter.use(requireAuth);
fantasyRulesRouter.get("/", getFantasyRules);
