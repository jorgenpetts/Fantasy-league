import type { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthenticatedPrincipal = Pick<AuthenticatedUser, "id" | "role">;

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
};
