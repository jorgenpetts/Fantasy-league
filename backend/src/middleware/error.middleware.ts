import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  void next;
  if (error instanceof AppError) {
    logger.warn("Application error", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: error.statusCode,
      message: error.message,
      userId: req.user?.id,
      role: req.user?.role,
    });

    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    logger.warn("Validation error", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: 400,
      issues: error.issues,
      userId: req.user?.id,
      role: req.user?.role,
    });

    res.status(400).json({
      message: "Invalid request payload",
      issues: error.issues,
    });
    return;
  }

  logger.error("Unhandled error", {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    statusCode: 500,
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    userId: req.user?.id,
    role: req.user?.role,
  });

  res.status(500).json({
    message: "Internal server error",
  });
};
