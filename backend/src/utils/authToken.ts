import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthTokenPayload } from "../types/auth.js";

export function signAuthToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    (payload.role !== "USER" && payload.role !== "ADMIN")
  ) {
    throw new Error("Invalid auth token payload");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
