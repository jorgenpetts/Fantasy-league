import { defineConfig } from "@playwright/test";

if (!process.env.MVP_QA_SCHEMA?.startsWith("qa_mvp_")) {
  throw new Error("Run live verification through backend/scripts/verify-mvp.mjs --browser.");
}

export default defineConfig({
  testDir: "./e2e/live",
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 15_000,
    baseURL: "http://localhost:3101",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    viewport: { width: 1440, height: 900 },
    timezoneId: "Africa/Johannesburg",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
  },
});
