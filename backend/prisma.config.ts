import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Client generation during Docker builds does not need a database URL.
  datasource: process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL,
      }
    : undefined,
});
