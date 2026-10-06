// Production requests always use the frontend origin so the auth cookie stays first-party.
// Local development can retain an explicit API URL when needed.
export const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api"
    : (process.env.NEXT_PUBLIC_API_URL?.trim() || "/api").replace(/\/+$/, "");
