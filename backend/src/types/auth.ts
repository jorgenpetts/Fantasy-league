import type { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
