import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/e2e/*.spec.ts",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3100",
    timezoneId: "Africa/Johannesburg",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: /mobile-interactions\.spec\.ts/, use: { viewport: { width: 1280, height: 900 } } },
    { name: "mobile", testIgnore: /responsive\.spec\.ts/, use: { viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
});
