import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AUTH_COOKIE_NAME: z.string().default("fantasy_cricket_session"),
  COOKIE_SECURE: z.stringbool().optional(),
  LOG_LEVEL: z.enum(["silent", "info", "debug"]).default("info"),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60_000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  COOKIE_SECURE:
    parsedEnv.COOKIE_SECURE ?? parsedEnv.NODE_ENV === "production",
};
