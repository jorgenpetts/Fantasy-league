import { test, expect } from "@playwright/test";
import { fantasyApi } from "./fixtures/fantasy-api";

test("401 clears private caches before another login", async ({ page }) => {
  const state = await fantasyApi(page, { role: "USER" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Coastal XI", exact: true })).toBeVisible();
  await page.route("**/api/players?**", async (route) => {
    state.role = null;
    await route.fulfill({ status: 401, json: { message: "Authentication required." } });
  });
  await page.getByRole("link", { name: "Players", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/login\?next=/);
  await expect(page.getByText("Coastal XI", { exact: true })).toHaveCount(0);
  state.noTeam = true;
  await page.unroute("**/api/players?**");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("next-manager@example.test");
  await page.getByLabel(/^Password/).fill("Cricket-password123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/players$/);
  // The Next.js development indicator overlaps the mobile Home hit target.
  await page.getByRole("link", { name: "Home", exact: true }).filter({ visible: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Create your fantasy team", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coastal XI", exact: true })).toHaveCount(0);
});

test("auth outage offers retry and preserves the protected deep link", async ({ page }) => {
  await fantasyApi(page);
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 503, json: { message: "Database stack trace" } }));
  await page.goto("/leaderboard?roundId=r1");
  await expect(page.getByText("Unable to verify your account", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/leaderboard\?roundId=r1/);
  await expect(page.getByText("Database stack trace")).toHaveCount(0);
  await page.unroute("**/api/auth/me");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fantasy Leaderboard", exact: true })).toBeVisible();
});

test("login uses one authoritative identity refresh and retains round query parameters", async ({ page }) => {
  await fantasyApi(page, { role: null });
  await page.goto("/leaderboard?roundId=r1");
  await expect(page).toHaveURL(/login\?next=%2Fleaderboard%3FroundId%3Dr1/);
  let identityRequests = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/auth/me")) identityRequests++; });
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("manager@example.test");
  await page.getByLabel(/^Password/).fill("Cricket-password123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Round Standings", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/leaderboard\?roundId=r1/);
  expect(identityRequests).toBe(1);
});

test("server failures in login show safe copy and remain retryable", async ({ page }) => {
  await fantasyApi(page, { role: null });
  await page.route("**/api/auth/login", (route) => route.fulfill({ status: 500, json: { message: "Internal stack trace and query" } }));
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("manager@example.test");
  await page.getByLabel(/^Password/).fill("Cricket-password123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Unable to sign in. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByText("Internal stack trace and query", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("a saved captain invalidates previously visited history", async ({ page }) => {
  const state = await fantasyApi(page);
  await page.goto("/team/history");
  await expect(page.getByRole("link", { name: /Club cricket round 10/ })).toBeVisible();
  const reads = () => state.reads.filter((path) => path === "/fantasy-teams/t1/lineups").length;
  const before = reads();
  await page.getByRole("link", { name: "Current Team", exact: true }).click();
  await page.getByRole("button", { name: "Make Captain", exact: true }).first().click();
  await page.getByRole("button", { name: "Save Team", exact: true }).click();
  await expect(page.getByText("Team saved successfully", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Team", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Round History", exact: true }).click();
  await expect.poll(reads).toBeGreaterThan(before);
});

for (const [path, endpoint, title] of [
  ["/players/not-real", "/players/not-real", "Player not found"],
  ["/team/not-real", "/fantasy-teams/not-real", "Fantasy team not found"],
] as const) {
  test(`not-found resource ${path}`, async ({ page }) => {
    await fantasyApi(page);
    await page.route(`**/api${endpoint}`, (route) => route.fulfill({ status: 404, json: { message: "Not found" } }));
    await page.goto(path);
    await expect(page.getByRole("heading", { name: title, exact: true }).last()).toBeVisible();
  });
}

test("account contains authoritative details without unfinished copy", async ({ page }) => {
  await fantasyApi(page, { role: "USER" });
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  await expect(page.getByText("test@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText(/coming soon|preferences will be added/i)).toHaveCount(0);
});

test("keyboard-only login and player filtering", async ({ page }) => {
  await fantasyApi(page, { role: null });
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeFocused();
  await page.keyboard.type("manager@example.test");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Cricket-password123!");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Welcome back, Alex", exact: true })).toBeVisible();
  const players = page.getByRole("link", { name: "Players", exact: true }).filter({ visible: true });
  await players.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Search players").focus();
  await page.keyboard.type("Player12");
  await expect(page.getByRole("link", { name: /Player12 Cricketer/ })).toBeVisible();
  const batter = page.getByRole("button", { name: "Batter", exact: true });
  await batter.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/position=BATTER/);
});

test("desktop replacement uses the visible market without a hidden modal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fantasyApi(page);
  await page.goto("/team");
  await page.getByRole("button", { name: "Change", exact: true }).nth(1).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("searchbox", { name: "Search available players" })).toBeFocused();
  await page.getByRole("button", { name: "Replace with Player12 Cricketer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Player12 Cricketer", exact: true })).toBeVisible();
});
