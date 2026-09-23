import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startedAt = process.hrtime.bigint();
  req.id = req.headers["x-request-id"]?.toString() ?? randomUUID();
  res.setHeader("X-Request-Id", req.id);

  logger.debug("Request received", {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    logger[level]("Request completed", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?.id,
      role: req.user?.role,
    });
  });

  next();
}
