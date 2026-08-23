import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

export function setAuthCookie(res: Response, token: string) {
  res.cookie(env.AUTH_COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions);
}
