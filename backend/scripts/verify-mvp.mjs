import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

// Never migrate or seed the configured application schema during QA.
const schema = `qa_mvp_${randomUUID().replaceAll("-", "")}`;
const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
url.searchParams.set("schema", schema);
url.searchParams.set("connection_limit", "3");
const env = {
  ...process.env,
  DATABASE_URL: url.href,
  DIRECT_URL: url.href,
  NODE_ENV: "test",
  JWT_SECRET: randomUUID() + randomUUID(),
  LOG_LEVEL: "silent",
  PORT: "4100",
  CORS_ORIGIN: "http://localhost:3101",
  AUTH_RATE_LIMIT_MAX_REQUESTS: "1000",
  NEXT_PUBLIC_API_URL: "http://localhost:4100/api",
  MVP_QA_SCHEMA: schema,
};
const db = new PrismaClient({ datasourceUrl: url.href });
function run(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
let server;
try {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  await run("npx", ["prisma", "migrate", "deploy"]);
  await run("npm", process.argv.includes("--browser-only") ? ["run", "build"] : ["test"]);
  if (process.argv.includes("--browser")) {
    await db.user.create({ data: {
      name: "QA Administrator", email: "qa-admin@example.test", role: "ADMIN",
      passwordHash: await bcrypt.hash("QA-cricket-password123!", 12),
    } });
    server = spawn("node", ["dist/server.js"], { env, stdio: "inherit" });
    await run("npx", ["playwright", "test", "--config=playwright.live.config.ts"], "../frontend");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "MVP verification failed");
  process.exitCode = 1;
} finally {
  if (server) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    if (server.exitCode === null) await stopped;
  }
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
  console.log("Temporary MVP QA schema removed.");
}
