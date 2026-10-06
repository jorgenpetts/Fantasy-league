import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
};

export function setAuthCookie(res: Response, token: string) {
  res.cookie(env.AUTH_COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.AUTH_COOKIE_NAME, authCookieOptions);
}
