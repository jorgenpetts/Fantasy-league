import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { verifyAuthToken } from "../utils/authToken.js";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[env.AUTH_COOKIE_NAME];

    if (!token || typeof token !== "string") {
      throw new AppError(401, "Authentication required.");
    }

    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Invalid session."));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, "Authentication required."));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "You do not have permission to perform this action."));
      return;
    }

    next();
  };
}
