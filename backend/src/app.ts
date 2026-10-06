import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./middleware/requestLogger.middleware.js";
import { apiRouter } from "./routes/index.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(requestLogger);

app.use("/health", healthRouter);
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", apiRouter);

app.use(errorHandler);
