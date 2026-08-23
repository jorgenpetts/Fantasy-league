import bcrypt from "bcrypt";
import type { User } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validator.js";
import { AppError } from "../utils/AppError.js";
import { signAuthToken } from "../utils/authToken.js";
import type { AuthenticatedUser } from "../types/auth.js";

const PASSWORD_SALT_ROUNDS = 12;

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
    },
  });

  const authUser = toAuthenticatedUser(user);
  const token = signAuthToken({
    sub: authUser.id,
    email: authUser.email,
    role: authUser.role,
  });

  return { user: authUser, token };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password.");
  }

  const authUser = toAuthenticatedUser(user);
  const token = signAuthToken({
    sub: authUser.id,
    email: authUser.email,
    role: authUser.role,
  });

  return { user: authUser, token };
}

export async function getUserById(userId: string): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(401, "Session user no longer exists.");
  }

  return toAuthenticatedUser(user);
}
