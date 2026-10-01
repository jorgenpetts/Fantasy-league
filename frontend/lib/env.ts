const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!configuredApiUrl && process.env.NODE_ENV === "production") {
  throw new Error("NEXT_PUBLIC_API_URL must be configured for production.");
}

export const API_BASE_URL =
  (configuredApiUrl || "http://localhost:4000/api").replace(/\/+$/, "");
