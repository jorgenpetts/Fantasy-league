import { api } from "@/lib/api";
import type { User } from "@/types/api";

export type AuthResponse = {
  user: User;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  name: string;
};

export function getCurrentUser() {
  return api.get<AuthResponse>("/auth/me");
}

export function login(payload: LoginPayload) {
  return api.post<AuthResponse>("/auth/login", payload);
}

export function register(payload: RegisterPayload) {
  return api.post<AuthResponse>("/auth/register", payload);
}

export function logout() {
  return api.post<{ message: string }>("/auth/logout");
}
