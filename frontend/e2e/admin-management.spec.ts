import { test, expect, type Page } from "@playwright/test";
import type { Player, Season, Round, UserRole } from "../types/api";

async function mockApi(page: Page, role: UserRole | null = "ADMIN") {
  const state = {
    players: [
      {
        id: "p1",
        firstName: "John",
        lastName: "Smith",
        position: "BATTER",
        price: 8500000,
        active: true,
      },
    ] as Player[],
    seasons: [
      {
        id: "s1",
        name: "Current Season",
        startDate: "2026-09-01T00:00:00.000Z",
        endDate: "2027-03-31T00:00:00.000Z",
        active: true,
      },
      {
        id: "s2",
        name: "Past Season",
        startDate: "2025-09-01T00:00:00.000Z",
        endDate: "2026-03-31T00:00:00.000Z",
        active: false,
      },
    ] as Season[],
    rounds: [
      {
        id: "r1",
        seasonId: "s1",
        roundNumber: 1,
        name: "Opening round",
        deadline: "2020-09-27T08:00:00.000Z",
        status: "UPCOMING",
        isLocked: true,
        canEdit: false,
      },
      {
        id: "r2",
        seasonId: "s1",
        roundNumber: 2,
        name: "Locked round",
        deadline: "2020-09-28T08:00:00.000Z",
        status: "LOCKED",
        isLocked: true,
        canEdit: false,
      },
    ] as Round[],
    writes: [] as { path: string; data: Record<string, unknown> }[],
    reads: [] as string[],
    nextError: null as { status: number; body: unknown } | null,
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api/, "");
    const method = request.method();
    const send = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/auth/me")
      return send(
        role
          ? {
              user: {
                id: "u",
                name: "Test Manager",
                role,
                email: "test@example.com",
              },
            }
          : { message: "Unauthenticated" },
        role ? 200 : 401,
      );
    if (path.startsWith("/admin/") && role !== "ADMIN")
      return send({ message: "Forbidden" }, 403);
    if (method === "GET") {
      state.reads.push(path + url.search);
      if (path === "/players")
        return send({
          players: state.players.filter(
            (p) =>
              (!url.searchParams.has("active") ||
                p.active === (url.searchParams.get("active") === "true")) &&
              (!url.searchParams.has("position") ||
                p.position === url.searchParams.get("position")) &&
              `${p.firstName} ${p.lastName}`
                .toLowerCase()
                .includes((url.searchParams.get("search") ?? "").toLowerCase()),
          ),
        });
      if (path === "/seasons") return send({ seasons: state.seasons });
      if (path === "/seasons/current")
        return state.seasons.some((s) => s.active)
          ? send({ season: state.seasons.find((s) => s.active) })
          : send({ message: "No active season" }, 404);
      if (path === "/rounds")
        return send({
          rounds: state.rounds.filter(
            (r) => r.seasonId === url.searchParams.get("seasonId"),
          ),
        });
      if (path === "/leaderboard")
        return send({ leaderboard: { entries: [] } });
      if (path.endsWith("/performances")) return send({ performances: [] });
      if (path === "/dashboard") return send({ dashboard: { season: null } });
      return send({ message: "Not found" }, 404);
    }
    const data = request.postDataJSON() as Record<string, unknown>;
    state.writes.push({ path, data });
    if (state.nextError) {
      const error = state.nextError;
      state.nextError = null;
      return send(error.body, error.status);
    }
    const [, , domain, id] = path.split("/");
    if (domain === "players") {
      let player = state.players.find((p) => p.id === id);
      if (player) Object.assign(player, data);
      else {
        player = { ...data, id: `p${state.players.length + 1}` } as Player;
        state.players.push(player);
      }
      return send({ player }, id ? 200 : 201);
    }
    if (domain === "seasons") {
      if (data.active)
        state.seasons.forEach((s) => {
          s.active = false;
        });
      let season = state.seasons.find((s) => s.id === id);
      if (season) Object.assign(season, data);
      else {
        season = { ...data, id: `s${state.seasons.length + 1}` } as Season;
        state.seasons.push(season);
      }
      return send({ season }, id ? 200 : 201);
    }
    if (domain === "rounds") {
      let round = state.rounds.find((r) => r.id === id);
      if (round) Object.assign(round, data);
      else {
        round = { ...data, id: `r${state.rounds.length + 1}` } as Round;
        state.rounds.push(round);
      }
      round.canEdit =
        round.status === "UPCOMING" &&
        new Date(round.deadline).getTime() > Date.now();
      round.isLocked = !round.canEdit;
      return send({ round }, id ? 200 : 201);
    }
    return send({}, 404);
  });
  return state;
}

const visibleButton = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).filter({ visible: true });
async function select(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) {
    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
}

for (const role of ["USER", null] as const) {
  for (const section of ["players", "seasons", "rounds"]) {
    test(`${role ?? "guest"} access to ${section}`, async ({ page }) => {
      const state = await mockApi(page, role);
      await page.goto(`/admin/${section}`);
      await expect(page).toHaveURL(role ? /\/403$/ : /\/login\?next=/);
      if (role)
        await expect(
          page.getByRole("heading", { name: "Not authorised" }),
        ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Admin", exact: true }),
      ).toHaveCount(0);
      expect(state.reads.some((path) => path.startsWith("/admin/"))).toBe(
        false,
      );
    });
  }
}

test("players: create, edit, filter, deactivate and reactivate with exact ZAR", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/players"); // Prime the public directory cache before mutations.
  await expect(page.getByText("John Smith", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Admin", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await page
    .getByRole("link", { name: "Players", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/players$/);
  await visibleButton(page, "Add Player").click();
  await page
    .getByRole("button", { name: "Create Player", exact: true })
    .click();
  await expect(page.getByText("First name is required.")).toBeVisible();
  await page.getByLabel("First name", { exact: false }).fill("Jane");
  await page.getByLabel("Last name", { exact: false }).fill("Jones");
  await select(page, "Position *", "Bowler");
  await page.getByLabel("Price (ZAR)", { exact: false }).fill("9500000");
  await expect(page.getByText(/Display price: R9[.,]5m/)).toBeVisible();
  await fits(page);
  await page
    .getByRole("button", { name: "Create Player", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.data).toEqual({
    firstName: "Jane",
    lastName: "Jones",
    position: "BOWLER",
    price: 9500000,
    active: true,
  });
  await visibleButton(page, "Edit Jane Jones").click();
  await page.getByLabel("Price (ZAR)", { exact: false }).fill("8750000");
  await select(page, "Position *", "All-Rounder");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.data).toEqual({
    position: "ALL_ROUNDER",
    price: 8750000,
  });
  await page.getByLabel("Search players").fill("Jane");
  await expect(visibleButton(page, "Edit John Smith")).toHaveCount(0);
  await select(page, "Position filter", "All-Rounder");
  await visibleButton(page, "Edit Jane Jones").click();
  await page.getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByRole("dialog", { name: "Deactivate Jane Jones?" }),
  ).toBeVisible();
  const count = state.writes.length;
  await page
    .getByRole("button", { name: "Cancel", exact: true })
    .filter({ visible: true })
    .click();
  expect(state.writes.length).toBe(count);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.getByRole("button", { name: "Deactivate Player" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.players[1].active).toBe(false);
  await select(page, "Player status", "Inactive");
  await visibleButton(page, "Edit Jane Jones").click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "No players match your filters" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "← Back to Fantasy App", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("link", { name: "Players", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.getByText("Jane Jones", { exact: true })).toBeVisible();
  expect(state.players[1].active).toBe(true);
  await fits(page);
});

test("seasons: date validation, creation, activation, partial edits and overview refresh", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/admin"); // Prime the shared current-season cache.
  await expect(page.getByText("Current Season", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Seasons", exact: true })
    .filter({ visible: true })
    .click();
  await visibleButton(page, "Create Season").click();
  await page.getByLabel("Season name", { exact: false }).fill("New Season");
  await page.getByLabel("Start date", { exact: false }).fill("2027-09-01");
  await page.getByLabel("End date", { exact: false }).fill("2027-08-01");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Season" })
    .click();
  await expect(
    page.getByText("End date must be on or after start date."),
  ).toBeVisible();
  await page.getByLabel("End date", { exact: false }).fill("2028-03-31");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Season" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Activate New Season?" }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(0);
  await fits(page);
  await page.getByRole("button", { name: "Activate Season" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.seasons.filter((s) => s.active).map((s) => s.name)).toEqual([
    "New Season",
  ]);
  await visibleButton(page, "Edit New Season").click();
  await page.getByLabel("Season name", { exact: false }).fill("Updated Season");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.data).toEqual({ name: "Updated Season" });
  await page
    .getByRole("link", { name: "Overview", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Updated Season", { exact: true })).toBeVisible();
});

test("rounds: season scope, deadline conversion, duplicate errors, lock and completion", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/admin/rounds");
  await expect(
    page
      .getByText("Team editing locked: deadline passed")
      .filter({ visible: true }),
  ).toBeVisible();
  await visibleButton(page, "Create Round").click();
  await page.getByLabel("Round number", { exact: false }).fill("1");
  await page.getByLabel("Round name", { exact: false }).fill("New round");
  await page
    .getByLabel("Deadline (", { exact: false })
    .fill("2030-10-01T10:30");
  await fits(page);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Round" })
    .click();
  await expect(
    page.getByText("A round with this number already exists for this season."),
  ).toBeVisible();
  await page.getByLabel("Round number", { exact: false }).fill("3");
  state.nextError = {
    status: 409,
    body: {
      message: "A round with this number already exists for this season.",
    },
  };
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Round" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "A round with this number already exists",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Round" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.rounds.at(-1)?.deadline).toBe("2030-10-01T08:30:00.000Z");
  await visibleButton(page, "Edit Round 3").click();
  await page
    .getByLabel("Deadline (", { exact: false })
    .fill("2030-10-01T09:30");
  await select(page, "Stored status *", "Locked");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByRole("dialog", { name: "Update Round 3?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm Changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.data).toEqual({
    deadline: "2030-10-01T07:30:00.000Z",
    status: "LOCKED",
  });
  await visibleButton(page, "Complete Round 3").click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.rounds.at(-1)?.status).toBe("LOCKED");
  await visibleButton(page, "Complete Round 3").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Complete Round" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes.at(-1)?.data).toEqual({ status: "COMPLETED" });
  await expect(visibleButton(page, "Complete Round 3")).toHaveCount(0);
  expect(state.writes.some((w) => w.path.includes("recalculate"))).toBe(false);
  await select(page, "Filter by season", "Past Season");
  await expect(
    page.getByRole("heading", {
      name: "No rounds have been created for this season.",
    }),
  ).toBeVisible();
  await fits(page);
});

test("failed mutations retain the form and hide internal errors", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/admin/players");
  await visibleButton(page, "Edit John Smith").click();
  await page.getByLabel("First name", { exact: false }).fill("Changed");
  state.nextError = {
    status: 500,
    body: { message: "Prisma internal stack trace" },
  };
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Unable to save changes. Please try again in a moment.",
  );
  await expect(page.getByLabel("First name", { exact: false })).toHaveValue(
    "Changed",
  );
  await expect(page.getByText("Prisma internal stack trace")).toHaveCount(0);
  state.nextError = {
    status: 400,
    body: { issues: [{ path: ["price"], message: "Invalid price" }] },
  };
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByText("Enter a positive whole ZAR amount."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(visibleButton(page, "Edit John Smith")).toBeFocused();
});
