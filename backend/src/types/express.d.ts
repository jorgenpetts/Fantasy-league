import type { AuthenticatedPrincipal } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthenticatedPrincipal;
    }
  }
}

export {};
