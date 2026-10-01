import assert from "node:assert/strict";
import test from "node:test";
import { getOverviewRound, isAdminNavActive } from "./utils.ts";
import type { Round } from "../../types/api.ts";

const round = (
  id: string,
  status: Round["status"],
  canEdit = false,
): Round => ({
  id,
  seasonId: "s",
  roundNumber: Number(id),
  name: id,
  deadline: `2026-09-0${id}T12:00:00.000Z`,
  status,
  canEdit,
  isLocked: !canEdit,
});

test("overview prioritises outstanding results, then editable rounds, then latest history", () => {
  const completed = round("1", "COMPLETED");
  const locked = round("2", "LOCKED");
  const upcoming = round("3", "UPCOMING", true);
  assert.equal(getOverviewRound([]), null);
  assert.equal(getOverviewRound([upcoming, locked, completed]), locked);
  assert.equal(getOverviewRound([completed, upcoming]), upcoming);
  assert.equal(getOverviewRound([completed]), completed);
  const overdue = round("2", "UPCOMING");
  assert.equal(getOverviewRound([upcoming, overdue]), overdue);
  assert.equal(overdue.status, "UPCOMING");
});

test("admin navigation matches nested paths without activating Overview or sibling prefixes", () => {
  assert.equal(isAdminNavActive("/admin", "/admin"), true);
  assert.equal(isAdminNavActive("/admin/players/123", "/admin/players"), true);
  assert.equal(isAdminNavActive("/admin/players", "/admin"), false);
  assert.equal(
    isAdminNavActive("/admin/players-other", "/admin/players"),
    false,
  );
});
