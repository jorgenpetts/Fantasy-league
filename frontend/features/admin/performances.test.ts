import assert from "node:assert/strict";
import test from "node:test";
import type { Player, PlayerPerformance } from "../../types/api.ts";
import {
  draftFromPerformance,
  matchesSaved,
  performancePlayers,
  performanceProgress,
  prepareBulkSave,
  scoringInvalidationPrefixes,
} from "./performances/model.ts";

const player = (id: string, active = true): Player => ({
  id,
  firstName: "Jo",
  lastName: id,
  active,
  price: 100,
  position: "BATTER",
});
const saved = {
  ...Object.fromEntries(
    Object.entries(draftFromPerformance()).map(([key, value]) => [
      key,
      key === "didBat" || key === "notOut" ? value : Number(value),
    ]),
  ),
  playerId: "a",
  fantasyPoints: 0,
  player: player("a"),
} as PlayerPerformance;

test("untouched missing performances never enter a bulk payload", () => {
  assert.deepEqual(prepareBulkSave({}).performances, []);
  const result = prepareBulkSave({ a: draftFromPerformance() });
  assert.equal(result.performances.length, 1);
  assert.equal(result.performances[0].runs, 0);
  assert.equal(result.performances[0].didBat, false);
  assert.equal(result.performances[0].notOut, false);
  assert.equal("fantasyPoints" in result.performances[0], false);
  assert.deepEqual(result.errors, {});
});

test("didBat is explicit, including a duck; restoring saved values clears dirty state", () => {
  const draft = { ...draftFromPerformance(saved), didBat: true };
  assert.equal(matchesSaved(draft, saved), false);
  assert.equal(prepareBulkSave({ a: draft }).performances[0].didBat, true);
  assert.equal(prepareBulkSave({ a: draft }).performances[0].runs, 0);
  assert.equal(matchesSaved(draftFromPerformance(saved), saved), true);
  assert.equal(matchesSaved(draftFromPerformance(), undefined), false);
  assert.equal(
    matchesSaved({ ...draftFromPerformance(saved), runs: "0e0" }, saved),
    false,
  );
});

test("not out and maidens are included in performance payloads", () => {
  const result = prepareBulkSave({
    a: {
      ...draftFromPerformance(),
      didBat: true,
      notOut: true,
      maidens: "2",
    },
  });
  assert.equal(result.performances[0].notOut, true);
  assert.equal(result.performances[0].maidens, 2);
  assert.deepEqual(result.errors, {});
});

test("reject negative, fractional, blank, notation and overflowing stats", () => {
  for (const value of ["-1", "1.5", "", "1e2", "2147483648", "NaN"]) {
    const result = prepareBulkSave({
      a: { ...draftFromPerformance(), runs: value },
    });
    assert.ok(result.errors.a.runs);
  }
  assert.deepEqual(
    prepareBulkSave({ a: { ...draftFromPerformance(), runs: "0" } }).errors,
    {},
  );
});

test("progress uses record existence, including zeros and inactive historical players", () => {
  const old = { ...saved, playerId: "old", player: player("old", false) };
  const players = performancePlayers([player("a"), player("b")], [saved, old]);
  assert.equal(players.length, 3);
  assert.deepEqual(performanceProgress(players, [saved, old]), {
    entered: 2,
    total: 3,
    outstanding: 1,
  });
  assert.deepEqual(performanceProgress([], []), {
    entered: 0,
    total: 0,
    outstanding: 0,
  });
});

test("score updates invalidate every consuming domain without dropping auth", () => {
  for (const prefix of [
    "dashboard",
    "leaderboard",
    "fantasy-team",
    "lineups",
    "player",
    "players",
    "round",
    "admin",
  ])
    assert.ok(
      scoringInvalidationPrefixes.includes(
        prefix as (typeof scoringInvalidationPrefixes)[number],
      ),
    );
  assert.ok(
    !scoringInvalidationPrefixes.some((prefix: string) => prefix === "auth"),
  );
});
