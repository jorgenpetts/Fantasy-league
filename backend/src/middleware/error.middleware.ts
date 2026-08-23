import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request payload",
      issues: error.issues,
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: "Internal server error",
  });
};
