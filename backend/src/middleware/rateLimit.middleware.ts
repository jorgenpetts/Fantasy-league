import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  keyGenerator: (req: Request) => string | null;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function cleanupExpiredBuckets(now: number) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createRateLimit({
  windowMs,
  maxRequests,
  keyPrefix,
  keyGenerator,
}: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const generatedKey = keyGenerator(req);

    if (!generatedKey) {
      next();
      return;
    }

    const key = `${keyPrefix}:${generatedKey}`;
    const existing = buckets.get(key);
    const entry =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + windowMs };

    entry.count += 1;
    buckets.set(key, entry);

    const remaining = Math.max(0, maxRequests - entry.count);
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1_000);

    res.setHeader("RateLimit-Limit", maxRequests);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1_000));

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", retryAfterSeconds);

      logger.warn("Rate limit exceeded", {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        keyPrefix,
        retryAfterSeconds,
      });

      res.status(429).json({
        message: "Too many requests. Please try again later.",
      });
      return;
    }

    next();
  };
}

export const authRateLimit = createRateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  maxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: "auth",
  keyGenerator: (req) => {
    const email = req.body?.email;

    return typeof email === "string" && email.trim()
      ? email.trim().toLowerCase()
      : null;
  },
});
