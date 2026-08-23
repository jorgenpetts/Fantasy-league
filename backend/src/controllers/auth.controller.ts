import type { Request, Response } from "express";
import {
  getUserById,
  loginUser,
  registerUser,
} from "../services/auth.service.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const { user, token } = await registerUser(input);

  setAuthCookie(res, token);

  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { user, token } = await loginUser(input);

  setAuthCookie(res, token);

  res.status(200).json({ user });
}

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res);

  res.status(200).json({ message: "Logged out." });
}

export async function me(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const user = await getUserById(userId);

  res.status(200).json({ user });
}
