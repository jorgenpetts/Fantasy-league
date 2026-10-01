import { test, expect, type APIResponse } from "@playwright/test";
import type { FantasyLineup, Player, Round, Season } from "../../types/api";

const api = "http://localhost:4100/api";
const password = "QA-cricket-password123!";
async function json<T>(response: APIResponse): Promise<T> {
  expect(response.ok(), `${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
const stats = (runs: number) => ({ didBat: true, runs, ballsFaced: runs, wickets: 0, runsConceded: 0, ballsBowled: 0, catches: 0, droppedCatches: 0, stumpings: 0, runOuts: 0 });

test("real JWT, registration, four rounds, scoring corrections, privacy and ADMIN-as-player", async ({ page, browser, playwright }) => {
  const adminContext = await browser.newContext({ baseURL: "http://localhost:3101", viewport: { width: 1440, height: 900 } });
  const admin = adminContext.request;
  const adminPage = await adminContext.newPage();
  const other = await playwright.request.newContext();
  const errors: string[] = [];
  for (const view of [page, adminPage]) view.on("pageerror", (error) => errors.push(error.message));
  try {
    await expect.poll(async () => {
      try { return (await admin.get(`${api}/health`)).status(); } catch { return 0; }
    }).toBe(200);
    await json(await admin.post(`${api}/auth/login`, { data: { email: "qa-admin@example.test", password } }));
    const { season } = await json<{ season: Season }>(await admin.post(`${api}/admin/seasons`, { data: {
      name: "MVP QA Competition", startDate: "2026-01-01T00:00:00Z", endDate: "2030-12-31T00:00:00Z", active: true,
    } }));
    async function createRound(roundNumber: number) {
      return (await json<{ round: Round }>(await admin.post(`${api}/admin/rounds`, { data: {
        seasonId: season.id, roundNumber, name: `QA Round ${roundNumber}`,
        deadline: new Date(Date.now() + roundNumber * 86_400_000).toISOString(),
      } }))).round;
    }
    const players: Player[] = [];
    for (const [position, count] of [["WICKET_KEEPER", 2], ["BATTER", 6], ["ALL_ROUNDER", 3], ["BOWLER", 5]] as const) {
      for (let i = 1; i <= count; i++) {
        players.push((await json<{ player: Player }>(await admin.post(`${api}/admin/players`, { data: {
          firstName: position === "WICKET_KEEPER" ? "Keeper" : position === "BATTER" ? "Batter" : position === "ALL_ROUNDER" ? "Allrounder" : "Bowler",
          lastName: `QA${i}`, position, price: 9_000_000, active: true,
        } }))).player);
      }
    }
    const first = [players[0]!, ...players.slice(2, 6), ...players.slice(8, 10), ...players.slice(11, 15)];
    const second = [players[1]!, players[6]!, players[7]!, players[4]!, players[5]!, players[10]!, players[9]!, players[15]!, ...players.slice(12, 15)];
    const r1 = await createRound(1);

    // Registration, team creation and all eleven selections use the real browser UI.
    await page.goto("/register");
    await page.getByRole("textbox", { name: "Name", exact: true }).fill("QA Manager");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("qa-user@example.test");
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel(/^Confirm password/).fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Welcome back, QA Manager" })).toBeVisible();
    const cookies = await page.context().cookies(api);
    const cookie = cookies.find((c) => c.name === "fantasy_cricket_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.value.split(".")).toHaveLength(3);
    await page.getByRole("link", { name: "Create Team", exact: true }).click();
    await page.getByLabel("Team name").fill("QA Coastal XI");
    await page.getByRole("button", { name: "Create Team", exact: true }).click();
    const positionLabels = { WICKET_KEEPER: "Wicketkeeper", BATTER: "Batter", ALL_ROUNDER: "All-Rounder", BOWLER: "Bowler" };
    for (const player of first) {
      await page.getByRole("button", { name: `Add ${positionLabels[player.position]}`, exact: true }).first().click();
      await page.getByRole("button", { name: `Select ${player.firstName} ${player.lastName}`, exact: true }).filter({ visible: true }).click();
    }
    await page.getByRole("button", { name: "Make Captain", exact: true }).first().click();
    await page.getByRole("button", { name: "Save Team", exact: true }).click();
    await expect(page.getByText("Team saved successfully", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Team", exact: true })).toBeDisabled();
    const user = page.request;
    const { fantasyTeam: team } = await json<{ fantasyTeam: { id: string } }>(await user.get(`${api}/fantasy-teams/me`));
    async function lineup(round: Round) {
      return (await json<{ lineup: FantasyLineup }>(await user.get(`${api}/lineups/${team.id}/${round.id}`))).lineup;
    }
    const initial = await lineup(r1);
    expect(initial.players).toHaveLength(11);
    expect(initial.transfers.transfersMade).toBe(0);
    expect(initial.transfers.transferPenalty).toBe(0);
    expect(initial.captainId).toBe(first[0]!.id);
    await page.getByRole("link", { name: "Home", exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "QA Coastal XI", exact: true })).toBeVisible();

    await json(await other.post(`${api}/auth/register`, { data: { name: "QA Rival", email: "qa-rival@example.test", password } }));
    const privateResponse = await json<{ lineup: object }>(await other.get(`${api}/lineups/${team.id}/${r1.id}`));
    expect(privateResponse.lineup).toHaveProperty("lineupLockedForViewing", true);
    expect(privateResponse.lineup).not.toHaveProperty("players");
    expect(privateResponse.lineup).not.toHaveProperty("captainId");
    await adminPage.goto(`/team/${team.id}`);
    await expect(adminPage.getByText("Team locked for viewing", { exact: true })).toBeVisible();
    expect((await user.post(`${api}/admin/players`, { data: {} })).status()).toBe(403);
    await page.goto("/admin/rounds");
    await expect(page).toHaveURL(/\/403$/);

    async function lock(round: Round) {
      await json(await admin.put(`${api}/admin/rounds/${round.id}`, { data: { status: "LOCKED", deadline: new Date(Date.now() - 60_000).toISOString() } }));
    }
    await lock(r1);
    await page.goto("/team");
    await expect(page.getByText("Read only", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Team|Make Captain|Remove .*QA/ })).toHaveCount(0);
    expect((await user.put(`${api}/lineups/${team.id}/${r1.id}`, { data: { playerIds: first.map((p) => p.id), captainId: first[1]!.id } })).status()).toBe(403);
    await adminPage.reload();
    await expect(adminPage.getByText("Saved round selection", { exact: true })).toBeVisible();
    expect((await json<{ lineup: FantasyLineup }>(await other.get(`${api}/lineups/${team.id}/${r1.id}`))).lineup.players).toHaveLength(11);

    // The first scoring and completion cycle uses the actual admin forms.
    await adminPage.goto(`/admin/performances?roundId=${r1.id}`);
    await adminPage.getByRole("checkbox", { name: "Keeper QA1 batted", exact: true }).filter({ visible: true }).check();
    await adminPage.getByRole("textbox", { name: "Keeper QA1 Runs", exact: true }).filter({ visible: true }).fill("50");
    await adminPage.getByRole("button", { name: "Save Changes", exact: true }).click();
    await expect(adminPage.getByLabel("Keeper QA1 saved fantasy points").filter({ visible: true })).toHaveText("70 pts");
    await adminPage.getByRole("button", { name: "Recalculate Scores", exact: true }).click();
    await adminPage.getByRole("dialog").getByRole("button", { name: "Recalculate", exact: true }).click();
    await expect(adminPage.getByRole("dialog")).toHaveCount(0);
    await adminPage.getByRole("button", { name: "Complete Round", exact: true }).click();
    await adminPage.getByRole("dialog").getByRole("button", { name: "Complete Round", exact: true }).click();
    await expect(adminPage.getByRole("button", { name: "Edit Completed Results", exact: true })).toBeVisible();
    expect((await lineup(r1)).roundPoints).toBe(140);

    async function save(round: Round, squad: Player[]) {
      return json(await user.put(`${api}/lineups/${team.id}/${round.id}`, { data: { playerIds: squad.map((p) => p.id), captainId: squad[0]!.id } }));
    }
    async function score(round: Round, player: Player, runs: number) {
      await lock(round);
      await json(await admin.put(`${api}/admin/rounds/${round.id}/performances`, { data: { performances: [{ playerId: player.id, ...stats(runs) }] } }));
      await json(await admin.post(`${api}/admin/rounds/${round.id}/recalculate`));
      await json(await admin.put(`${api}/admin/rounds/${round.id}`, { data: { status: "COMPLETED" } }));
    }
    const chipUrl = (round: Round) => `${api}/fantasy-teams/${team.id}/rounds/${round.id}/chip`;
    const r2 = await createRound(2);
    const carried = await json<{ suggestedLineup: FantasyLineup }>(await user.get(`${api}/lineups/me/current`));
    expect(carried.suggestedLineup.players.map((p) => p.id).sort()).toEqual(first.map((p) => p.id).sort());
    await save(r2, second);
    expect((await lineup(r2)).transfers).toMatchObject({ transfersMade: 5, transferPenalty: 8 });
    await score(r2, second[0]!, 73);
    expect((await lineup(r2)).roundPoints).toBe(178);
    const r3 = await createRound(3);
    await json(await user.post(chipUrl(r3), { data: { chipType: "WILDCARD" } }));
    expect((await user.post(chipUrl(r3), { data: { chipType: "TRIPLE_CAPTAIN" } })).status()).toBe(409);
    await save(r3, first);
    expect((await lineup(r3)).transfers).toMatchObject({ transfersMade: 5, transferPenalty: 0 });
    await score(r3, first[0]!, 50);
    const r4 = await createRound(4);
    expect((await user.post(chipUrl(r4), { data: { chipType: "WILDCARD" } })).status()).toBe(409);
    await json(await user.post(chipUrl(r4), { data: { chipType: "TRIPLE_CAPTAIN" } }));
    await save(r4, first);
    await score(r4, first[0]!, 50);
    expect((await lineup(r4)).roundPoints).toBe(210);

    // Correct a completed round. Every consumer must agree with persisted totals.
    await adminPage.goto(`/admin/performances?roundId=${r1.id}`);
    await adminPage.getByRole("button", { name: "Edit Completed Results", exact: true }).click();
    await adminPage.getByRole("textbox", { name: "Keeper QA1 Runs", exact: true }).filter({ visible: true }).fill("100");
    await adminPage.getByRole("button", { name: "Save Changes", exact: true }).click();
    await expect(adminPage.getByLabel("Keeper QA1 saved fantasy points").filter({ visible: true })).toHaveText("140 pts");
    const corrected = await lineup(r1);
    expect(corrected.roundPoints).toBe(280);
    expect(corrected.captainId).toBe(initial.captainId);
    expect(corrected.players.map((p) => p.id).sort()).toEqual(initial.players.map((p) => p.id).sort());
    expect(corrected.transfers).toEqual(initial.transfers);
    for (let i = 0; i < 2; i++) await json(await admin.post(`${api}/admin/rounds/${r1.id}/recalculate`));
    expect((await lineup(r1)).roundPoints).toBe(280);
    const total = 280 + 178 + 140 + 210;
    type Standings = { leaderboard: { entries: Array<{ fantasyTeamId: string; totalPoints: number; roundPoints: number; rank: number }> } };
    const standings = await json<Standings>(await user.get(`${api}/leaderboard`));
    expect(standings.leaderboard.entries.find((e) => e.fantasyTeamId === team.id)).toMatchObject({ totalPoints: total, rank: 1 });
    const roundStandings = await json<Standings>(await user.get(`${api}/leaderboard?roundId=${r2.id}`));
    expect(roundStandings.leaderboard.entries.find((e) => e.fantasyTeamId === team.id)?.roundPoints).toBe(178);
    await page.goto("/");
    await expect(page.getByText(`${total} pts`, { exact: true }).first()).toBeVisible();
    await page.goto(`/team/history/${r4.id}`);
    await expect(page.getByText("Contribution 210 pts", { exact: true })).toBeVisible();
    await page.goto(`/team/history/${r1.id}`);
    await expect(page.getByText("Contribution 280 pts", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Final Results", { exact: true })).toBeVisible();
    await page.goto(`/leaderboard?roundId=${r2.id}`);
    await expect(page.getByText("178", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.goto(`/players/${first[0]!.id}`);
    await expect(page.getByRole("heading", { name: "Keeper QA1", exact: true })).toBeVisible();

    const { fantasyTeam: adminTeam } = await json<{ fantasyTeam: { id: string } }>(await admin.post(`${api}/fantasy-teams`, { data: { seasonId: season.id, name: "QA Admin XI" } }));
    const r5 = await createRound(5);
    await json(await admin.put(`${api}/lineups/${adminTeam.id}/${r5.id}`, { data: { playerIds: first.map((p) => p.id), captainId: first[0]!.id } }));
    await adminPage.goto("/team");
    await expect(adminPage.getByRole("heading", { name: "QA Admin XI", exact: true })).toBeVisible();
    await adminPage.goto("/admin");
    await adminPage.getByRole("link", { name: /Back to Fantasy App/ }).click();
    await expect(adminPage.getByRole("heading", { name: "QA Admin XI", exact: true })).toBeVisible();

    await page.context().addCookies([{ ...cookie!, value: "invalid.jwt.token" }]);
    await page.goto("/players");
    await expect(page).toHaveURL(/login/);
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("qa-user@example.test");
    await page.getByLabel(/^Password/).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Player Directory", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page).toHaveURL(/login/);
    expect((await user.get(`${api}/auth/me`)).status()).toBe(401);
    expect((await page.context().cookies(api)).some((c) => c.name === "fantasy_cricket_session")).toBe(false);
    expect(errors).toEqual([]);
  } finally {
    await adminContext.close();
    await other.dispose();
  }
});
