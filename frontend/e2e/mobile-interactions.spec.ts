import { test, expect, type Page } from "@playwright/test";
import { fantasyApi } from "./fixtures/fantasy-api";

async function fits(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
}
async function dialogFits(page: Page) {
  const box = await page.getByRole("dialog").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height + 1,
  );
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
}

for (const route of ["login", "register"])
  test(`${route} form and logout`, async ({ page }) => {
    await fantasyApi(page, { role: null });
    await page.goto(`/${route}`);
    if (route === "register")
      await page.getByLabel("Name", { exact: false }).fill("Alex Manager");
    await page.getByLabel("Email", { exact: false }).fill("test@example.com");
    await page
      .getByLabel("Password", { exact: false })
      .first()
      .fill("Cricket-password123!");
    if (route === "register")
      await page
        .getByLabel("Confirm password", { exact: false })
        .fill("Cricket-password123!");
    await page
      .getByRole("button", {
        name: route === "login" ? "Sign in" : "Create account",
      })
      .click();
    await expect(
      page.getByRole("heading", { name: /Welcome back/ }),
    ).toBeVisible();
    await fits(page);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/login/);
  });

test("directory, history, other team and leaderboard navigation", async ({
  page,
}) => {
  await fantasyApi(page, { edge: true });
  await page.goto("/players");
  await page.getByLabel("Search players").fill("Player12");
  await page.getByRole("button", { name: "Batter", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Player12 Cricketer/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Player12 Cricketer/ }).click();
  await expect(
    page.getByRole("heading", { name: "Player12 Cricketer" }),
  ).toBeVisible();
  await page.goto("/team/history");
  await page.getByRole("link", { name: /Club cricket round 10/ }).click();
  await expect(page).toHaveURL(/history\/r0/);
  await page.getByRole("link", { name: /Newer/ }).click();
  await expect(page).toHaveURL(/history\/r1/);
  await page.goto("/leaderboard");
  await page.getByRole("link", { name: "Round", exact: true }).click();
  await expect(
    page.getByText("Round Standings", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Contenders Rivals/ })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/team\/t2/);
  await fits(page);
});

for (const [width, height] of [
  [375, 812],
  [667, 375],
  [844, 390],
])
  test(`picker, captain, save and chips ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    const state = await fantasyApi(page);
    await page.goto("/team");
    await page
      .getByRole("button", { name: "Change", exact: true })
      .nth(1)
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await dialogFits(page);
    await expect(
      page.getByRole("dialog").getByText("Choose a replacement batter"),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByLabel("Search available players")
      .fill("Player12");
    await page.screenshot({ path: info.outputPath(`picker-${width}.png`) });
    await page
      .getByRole("button", {
        name: "Replace with Player12 Cricketer",
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Make Captain", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "Save Team", exact: true }).click();
    await expect
      .poll(
        () => state.writes.filter((w) => w.path.startsWith("/lineups/")).length,
      )
      .toBe(1);
    expect(state.currentLineup.players.some((p) => p.id === "p12")).toBe(true);
    expect(state.currentLineup.captainId).not.toBe("p1");
    await page
      .getByRole("button", { name: "Activate", exact: true })
      .first()
      .click();
    await dialogFits(page);
    await page
      .getByRole("button", { name: "Activate Wildcard", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Remove Chip", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Remove Chip", exact: true })
      .click();
    await dialogFits(page);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove Chip", exact: true })
      .click();
    await expect.poll(() => state.chip).toBe(null);
    await fits(page);
    // Keyboard focus remains trapped and Escape dismisses the picker.
    await page.getByRole("button", { name: "Browse Players" }).click();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

test("create a team and fill an empty slot", async ({ page }) => {
  const state = await fantasyApi(page, { noTeam: true });
  await page.goto("/team");
  await page.getByLabel("Team name").fill("Coastal XI");
  await page.getByRole("button", { name: "Create Team", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove Player2 Cricketer", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Batter", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Player12 Cricketer", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Team", exact: true }).click();
  await expect
    .poll(() => state.writes.some((w) => w.path.startsWith("/lineups/")))
    .toBe(true);
});

for (const variant of [
  "empty",
  "failure",
  "loading",
  "privateTeam",
  "usedChips",
] as const)
  test(`${variant} states fit narrow screens`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 320, height: 812 });
    await fantasyApi(page, { [variant]: true, edge: true });
    const routes =
      variant === "privateTeam"
        ? ["/team/t2"]
        : variant === "usedChips"
          ? ["/team"]
          : [
              "/",
              "/players",
              "/players/p1",
              "/team",
              "/team/history",
              "/team/history/r0",
              "/team/t2",
              "/leaderboard",
              "/admin",
              "/admin/players",
              "/admin/seasons",
              "/admin/rounds",
              "/admin/performances",
            ];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(variant === "failure" ? 3500 : 250);
      await fits(page);
      await page.screenshot({
        path: info.outputPath(`${variant}-${route.replaceAll("/", "_")}.png`),
        fullPage: true,
      });
    }
    if (variant === "privateTeam")
      await expect(
        page.getByRole("heading", { name: "Team locked for viewing" }),
      ).toBeVisible();
    if (variant === "usedChips")
      await expect(page.getByText("Already used", { exact: true })).toHaveCount(
        2,
      );
  });

for (const [width, height] of [
  [320, 812],
  [667, 375],
  [844, 390],
])
  test(`admin dialogs scroll and restore focus ${width}x${height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height });
    await fantasyApi(page, { edge: true });
    for (const [path, label] of [
      ["players", "Add Player"],
      ["seasons", "Create Season"],
      ["rounds", "Create Round"],
    ]) {
      await page.goto(`/admin/${path}`);
      const opener = page.getByRole("button", { name: label, exact: true });
      await opener.click();
      await dialogFits(page);
      await page.screenshot({
        path: info.outputPath(`dialog-${path}-${width}.png`),
      });
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
      await expect(opener).toBeFocused();
      await opener.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      expect(
        await page
          .getByRole("dialog")
          .evaluate((el) => el.contains(document.activeElement)),
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(opener).toBeFocused();
      await page.keyboard.press("Space");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

test("larger browser text and long select options remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 812 });
  const state = await fantasyApi(page, { edge: true });
  state.seasons[0].name =
    "The unusually long East Coast Championship season name";
  for (const path of ["/", "/team", "/leaderboard", "/admin/performances"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await page.addStyleTag({ content: "html { font-size: 20px; }" });
    await fits(page);
  }
  await page.getByRole("combobox", { name: "Season", exact: true }).click();
  await expect(
    page.getByRole("option", { name: /unusually long/ }),
  ).toBeVisible();
  await fits(page);
  await page.keyboard.press("Escape");
});

test("transfer penalty and Triple Captain confirmations fit at 320px", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 812 });
  const state = await fantasyApi(page);
  const replacements = state.players
    .slice(1, 6)
    .map((p, index) => ({
      ...p,
      id: `reserve${index}`,
      firstName: `Reserve${index}`,
    }));
  state.players.push(...replacements);
  state.currentLineup.players = [
    state.players[0],
    ...replacements,
    ...state.players.slice(6, 11),
  ];
  await page.goto("/team");
  await page
    .getByRole("button", { name: "Make Captain", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Save Team", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirm Transfers" }),
  ).toBeVisible();
  await dialogFits(page);
  await expect(page.getByRole("dialog")).toContainText(
    "5 transfers. 3 are free and 2 additional transfers will cost 8 points.",
  );
  await page.screenshot({ path: info.outputPath("transfer-confirmation.png") });
  await page
    .getByRole("button", { name: "Save Team (-8 pts)", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Activate", exact: true })
    .last()
    .click();
  await dialogFits(page);
  await page
    .getByRole("button", { name: "Activate Triple Captain", exact: true })
    .click();
  await expect.poll(() => state.chip).toBe("TRIPLE_CAPTAIN");
});

test("empty history, empty round list and empty performance roster", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 812 });
  const state = await fantasyApi(page, { noHistory: true });
  await page.goto("/team/history");
  await expect(
    page.getByRole("heading", {
      name: /No .*history|No .*lineups|No .*rounds/i,
    }),
  ).toBeVisible();
  await fits(page);
  await page.screenshot({
    path: info.outputPath("no-history.png"),
    fullPage: true,
  });
  state.players = [];
  state.performances = [];
  await page.goto("/admin/performances");
  await expect(
    page.getByText("No players are available for performance entry."),
  ).toBeVisible();
  await fits(page);
  await page.screenshot({
    path: info.outputPath("no-performances.png"),
    fullPage: true,
  });
  state.rounds = [];
  await page.goto("/admin/performances");
  await expect(
    page.getByText("No rounds have been created for this season."),
  ).toBeVisible();
  await fits(page);
  await page.screenshot({
    path: info.outputPath("no-rounds.png"),
    fullPage: true,
  });
});
