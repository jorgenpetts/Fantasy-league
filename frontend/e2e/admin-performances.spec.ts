import { test, expect, type Page } from "@playwright/test";
import { fantasyApi } from "./fixtures/fantasy-api";

const input = (page: Page, name: string) =>
  page.getByRole("textbox", { name, exact: true }).filter({ visible: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).filter({ visible: true });
async function open(page: Page) {
  await page.goto("/admin/performances?roundId=r1");
  await expect(input(page, "Alex Keeper Runs")).toHaveValue("20");
}
async function select(page: Page, name: string, option: string) {
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

for (const role of ["USER", null] as const)
  test(`performance access ${role ?? "guest"}`, async ({ page }) => {
    const state = await fantasyApi(page, { role });
    await page.goto("/admin/performances");
    await expect(page).toHaveURL(role ? /\/403$/ : /\/login\?next=/);
    expect(state.reads.some((url) => url.startsWith("/admin/"))).toBe(false);
  });

test("bulk entry preserves missing rows, handles zeros/ducks, saves all raw stats and refreshes scores", async ({
  page,
}) => {
  const state = await fantasyApi(page);
  await open(page);
  await expect(
    page.getByText("1 / 12 listed players entered · 11 not entered"),
  ).toBeVisible();
  await input(page, "Alex Keeper Runs").fill("-1");
  await button(page, "Save Changes").click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please correct" }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(0);
  await input(page, "Alex Keeper Runs").fill("0");
  await page
    .getByRole("checkbox", { name: "Alex Keeper batted", exact: true })
    .filter({ visible: true })
    .check();
  for (const [label, value] of Object.entries({
    "Balls faced": "2",
    Wickets: "3",
    "Runs conceded": "40",
    "Balls bowled": "24",
    Catches: "2",
    "Dropped catches": "1",
    Stumpings: "1",
    "Run outs": "1",
  }))
    await input(page, `Alex Keeper ${label}`).fill(value);
  await button(page, "Record zero performance").first().click();
  await expect(
    page.getByText("2 unsaved players", { exact: true }),
  ).toBeVisible();
  await expect(button(page, "Recalculate Scores")).toBeDisabled();
  await button(page, "Save Changes").click();
  await expect(
    page.getByText("0 unsaved players", { exact: true }),
  ).toBeVisible();
  const rows = state.writes.at(-1)!.body.performances as Record<
    string,
    unknown
  >[];
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    playerId: "p1",
    didBat: true,
    runs: 0,
    wickets: 3,
    droppedCatches: 1,
  });
  expect(rows.every((r) => !("fantasyPoints" in r))).toBe(true);
  await expect(
    page
      .getByLabel("Alex Keeper saved fantasy points")
      .filter({ visible: true }),
  ).toHaveText("432 pts");
  await expect(page.getByRole("textbox", { name: /fantasy/i })).toHaveCount(0);
  await page.reload();
  await expect(input(page, "Alex Keeper Runs")).toHaveValue("0");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("save errors preserve drafts, map row errors, and navigation/discard confirmations work", async ({
  page,
}) => {
  const state = await fantasyApi(page);
  await open(page);
  await input(page, "Alex Keeper Runs").fill("30");
  state.nextError = {
    status: 400,
    body: {
      issues: [{ path: ["performances", 0, "runs"], message: "Invalid" }],
    },
  };
  await button(page, "Save Changes").click();
  await expect(input(page, "Alex Keeper Runs")).toHaveValue("30");
  await expect(input(page, "Alex Keeper Runs")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await select(page, "Round", "Round 12 · Club cricket round 12");
  await expect(
    page.getByRole("dialog", { name: "Unsaved performance changes" }),
  ).toBeVisible();
  await button(page, "Cancel").click();
  await expect(page).toHaveURL(/roundId=r1/);
  await page
    .getByRole("link", { name: "Overview", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Unsaved performance changes" }),
  ).toBeVisible();
  await button(page, "Cancel").click();
  await input(page, "Alex Keeper Runs").fill("31");
  await button(page, "Discard Changes").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Discard Changes" })
    .click();
  await expect(input(page, "Alex Keeper Runs")).toHaveValue("20");
  await select(page, "Round", "Round 12 · Club cricket round 12");
  await expect(page).toHaveURL(/roundId=r2/);
  await expect(input(page, "Alex Keeper Runs")).toHaveValue("0");
});

test("recalculation is confirmed, repeatable and reports failures; completion enables deliberate corrections", async ({
  page,
}) => {
  const state = await fantasyApi(page);
  await open(page);
  await button(page, "Recalculate Scores").click();
  await expect(
    page.getByRole("dialog", { name: "Recalculate Round 11?" }),
  ).toBeVisible();
  state.nextError = { status: 500, body: { message: "internal" } };
  await button(page, "Recalculate").click();
  await expect(page.getByRole("alert")).toContainText("Unable to recalculate");
  await button(page, "Recalculate").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(
      "1 performances processed · 2 fantasy lineups updated · 2 fantasy teams updated",
    ),
  ).toBeVisible();
  await button(page, "Recalculate Scores").click();
  await button(page, "Recalculate").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .getByLabel("Alex Keeper saved fantasy points")
      .filter({ visible: true }),
  ).toHaveText("777 pts");
  await button(page, "Complete Round").click();
  await expect(
    page.getByRole("dialog", { name: "Complete Round 11?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Complete Round" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(input(page, "Alex Keeper Runs")).toBeDisabled();
  expect(state.rounds.find((r) => r.id === "r1")!.status).toBe("COMPLETED");
  await button(page, "Edit Completed Results").click();
  await input(page, "Alex Keeper Runs").fill("25");
  await button(page, "Save Changes").click();
  await expect(
    page
      .getByLabel("Alex Keeper saved fantasy points")
      .filter({ visible: true }),
  ).toHaveText("432 pts");
  await expect(input(page, "Alex Keeper Runs")).toBeDisabled();
});

test("saved corrections refresh cached dashboard and leaderboard scores", async ({
  page,
}) => {
  const state = await fantasyApi(page);
  await page.goto("/");
  await expect(
    page.getByText("777 pts", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "View Full Leaderboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Fantasy Leaderboard" }),
  ).toBeVisible();
  await expect(
    page.getByText("777 pts", { exact: true }).filter({ visible: true }),
  ).not.toHaveCount(0);
  await page
    .getByRole("link", { name: "Admin", exact: true })
    .filter({ visible: true })
    .click();
  await page
    .getByRole("link", { name: "Performances", exact: true })
    .filter({ visible: true })
    .click();
  await expect(input(page, "Alex Keeper Runs")).toHaveValue("20");
  await input(page, "Alex Keeper Runs").fill("50");
  await button(page, "Save Changes").click();
  await expect(
    page
      .getByLabel("Alex Keeper saved fantasy points")
      .filter({ visible: true }),
  ).toHaveText("432 pts");
  await page
    .getByRole("link", { name: /Back to Fantasy App/ })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByText("432 pts", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "View Full Leaderboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Fantasy Leaderboard" }),
  ).toBeVisible();
  await expect(
    page.getByText("432 pts", { exact: true }).filter({ visible: true }),
  ).not.toHaveCount(0);
  expect(
    state.reads.filter((path) => path === "/dashboard").length,
  ).toBeGreaterThan(1);
  expect(
    state.reads.filter((path) => path.startsWith("/leaderboard")).length,
  ).toBeGreaterThan(1);
});
