import { Router } from "express";
import { adminRouter } from "./admin/index.js";
import { authRouter } from "./auth.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { fantasyTeamsRouter } from "./fantasyTeams.routes.js";
import { fantasyRulesRouter } from "./fantasyRules.routes.js";
import { healthRouter } from "./health.routes.js";
import { leaderboardRouter } from "./leaderboard.routes.js";
import { lineupsRouter } from "./lineups.routes.js";
import { playersRouter } from "./players.routes.js";
import { roundsRouter } from "./rounds.routes.js";
import { seasonsRouter } from "./seasons.routes.js";

export const apiRouter = Router();

apiRouter.use("/admin", adminRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/fantasy-teams", fantasyTeamsRouter);
apiRouter.use("/fantasy-rules", fantasyRulesRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/leaderboard", leaderboardRouter);
apiRouter.use("/lineups", lineupsRouter);
apiRouter.use("/players", playersRouter);
apiRouter.use("/rounds", roundsRouter);
apiRouter.use("/seasons", seasonsRouter);
