import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Round } from "../../types/api.ts";
import {
  getDefaultLeaderboardRound,
  getLeaderboardTeamHref,
} from "./utils.ts";

function round(
  roundNumber: number,
  status: Round["status"],
  canEdit = status === "UPCOMING",
): Round {
  return {
    id: `round-${roundNumber}`,
    seasonId: "season-1",
    roundNumber,
    name: `Round ${roundNumber}`,
    deadline: "2026-09-01T10:00:00.000Z",
    status,
    isLocked: !canEdit,
    canEdit,
  };
}

describe("leaderboard helpers", () => {
  it("prefers the latest completed round", () => {
    const result = getDefaultLeaderboardRound([
      round(5, "UPCOMING"),
      round(3, "COMPLETED", false),
      round(4, "LOCKED", false),
    ]);

    assert.equal(result?.id, "round-3");
  });

  it("falls back to the latest locked round, then the latest available round", () => {
    assert.equal(
      getDefaultLeaderboardRound([
        round(4, "LOCKED", false),
        round(5, "UPCOMING"),
      ])?.id,
      "round-4",
    );
    assert.equal(
      getDefaultLeaderboardRound([round(1, "UPCOMING"), round(2, "UPCOMING")])
        ?.id,
      "round-2",
    );
  });

  it("links the current user's team to the editor and other teams to profiles", () => {
    assert.equal(getLeaderboardTeamHref("team-1", "team-1"), "/team");
    assert.equal(getLeaderboardTeamHref("team-2", "team-1"), "/team/team-2");
  });
});
