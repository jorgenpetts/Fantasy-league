import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FantasyLineup, HiddenLineup, PlayerPerformance } from "../../types/api.ts";
import {
  getHistoricalLineups,
  getPerformancePointsByPlayer,
  getTeamRoundViews,
} from "./history-utils.ts";

function lineup(roundNumber: number, canEdit = false): FantasyLineup {
  return {
    id: `lineup-${roundNumber}`,
    fantasyTeam: { id: "team-1", name: "Test Team", managerName: "Manager" },
    round: {
      id: `round-${roundNumber}`,
      roundNumber,
      name: `Round ${roundNumber}`,
      deadline: "2026-09-01T10:00:00.000Z",
      status: canEdit ? "UPCOMING" : "COMPLETED",
      isLocked: !canEdit,
      canEdit,
    },
    captainId: "player-1",
    players: [],
    squadValue: 0,
    grossPoints: 0,
    roundPoints: 0,
    transfers: {
      transfersMade: 0,
      freeTransfers: 3,
      extraTransfers: 0,
      transferPenalty: 0,
      playersIn: [],
      playersOut: [],
      wildcardActive: false,
    },
    activeChip: null,
    createdAt: "2026-09-01T10:00:00.000Z",
  };
}

describe("historical lineup helpers", () => {
  it("excludes editable and hidden lineups and orders newest first", () => {
    const hidden: HiddenLineup = {
      team: { id: "team-1", name: "Test Team", managerName: "Manager" },
      round: lineup(4).round,
      lineupLockedForViewing: true,
    };

    const result = getHistoricalLineups([
      lineup(1),
      lineup(3),
      hidden,
      lineup(2),
      lineup(5, true),
    ]);

    assert.deepEqual(
      result.map((item) => item.round.roundNumber),
      [3, 2, 1],
    );
  });

  it("maps backend fantasy points by player and leaves missing players absent", () => {
    const performances = [
      { playerId: "player-1", fantasyPoints: 84 },
      { playerId: "player-2", fantasyPoints: 0 },
    ] as PlayerPerformance[];

    const points = getPerformancePointsByPlayer(performances);

    assert.equal(points.get("player-1"), 84);
    assert.equal(points.get("player-2"), 0);
    assert.equal(points.has("player-3"), false);
  });

  it("preserves privacy locks without exposing a missing editable lineup", () => {
    const editableWithoutResponse = lineup(5, true).round;
    const hiddenRound = lineup(4, true).round;
    const lockedWithoutLineup = lineup(3).round;
    const hidden: HiddenLineup = {
      team: { id: "team-2", name: "Other Team", managerName: "Manager" },
      round: hiddenRound,
      lineupLockedForViewing: true,
    };

    const views = getTeamRoundViews(
      [lockedWithoutLineup, editableWithoutResponse, hiddenRound],
      [hidden],
    );

    assert.deepEqual(
      views.map((view) => view.round.roundNumber),
      [4, 3],
    );
    assert.equal(views[0]?.lineup, hidden);
    assert.equal(views[1]?.lineup, null);
  });
});
