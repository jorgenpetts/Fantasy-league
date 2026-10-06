import type { NextConfig } from "next";

if (process.env.VERCEL === "1" && !process.env.BACKEND_ORIGIN?.trim()) {
  throw new Error("BACKEND_ORIGIN must be configured for Vercel builds.");
}

const backendOrigin = (process.env.BACKEND_ORIGIN?.trim() || "http://localhost:4000").replace(/\/+$/, "");

if (!/^https?:\/\/[^/]+$/.test(backendOrigin)) {
  throw new Error("BACKEND_ORIGIN must be an HTTP(S) origin without a path.");
}

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendOrigin}/api/:path*` }];
  },
};

export default nextConfig;
