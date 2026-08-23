import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateLineupGrossPoints,
  calculatePlayerFantasyPoints,
  getCaptainMultiplier,
} from "./scoring.service.js";

const basePerformance = {
  didBat: false,
  runs: 0,
  ballsFaced: 0,
  wickets: 0,
  runsConceded: 0,
  ballsBowled: 0,
  catches: 0,
  droppedCatches: 0,
  stumpings: 0,
  runOuts: 0,
};

describe("final scoring service", () => {
  it("applies duck penalty only when the player batted", () => {
    assert.equal(
      calculatePlayerFantasyPoints({ ...basePerformance, didBat: true, runs: 0 }),
      -20,
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        didBat: false,
        runs: 0,
      }),
      0,
    );
  });

  it("applies non-stacking batting milestone bonuses", () => {
    assert.equal(
      calculatePlayerFantasyPoints({ ...basePerformance, didBat: true, runs: 49 }),
      49,
    );
    assert.equal(
      calculatePlayerFantasyPoints({ ...basePerformance, didBat: true, runs: 50 }),
      70,
    );
    assert.equal(
      calculatePlayerFantasyPoints({ ...basePerformance, didBat: true, runs: 99 }),
      119,
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        didBat: true,
        runs: 100,
      }),
      140,
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        didBat: true,
        runs: 150,
      }),
      190,
    );
  });

  it("applies non-stacking bowling milestone bonuses", () => {
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, wickets: 1 }), 20);
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, wickets: 2 }), 40);
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, wickets: 3 }), 80);
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, wickets: 4 }), 100);
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, wickets: 5 }), 140);
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, wickets: 6 }), 160);
  });

  it("applies expensive bowling penalty only above threshold with zero wickets", () => {
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        runsConceded: 50,
        wickets: 0,
      }),
      0,
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        runsConceded: 51,
        wickets: 0,
      }),
      -20,
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        runsConceded: 80,
        wickets: 0,
      }),
      -20,
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        runsConceded: 80,
        wickets: 1,
      }),
      20,
    );
  });

  it("applies fielding points and penalties", () => {
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, catches: 2 }), 20);
    assert.equal(
      calculatePlayerFantasyPoints({ ...basePerformance, droppedCatches: 2 }),
      -20,
    );
    assert.equal(
      calculatePlayerFantasyPoints({ ...basePerformance, stumpings: 1 }),
      15,
    );
    assert.equal(calculatePlayerFantasyPoints({ ...basePerformance, runOuts: 1 }), 15);
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        catches: 1,
        droppedCatches: 1,
        stumpings: 1,
        runOuts: 1,
      }),
      30,
    );
  });

  it("applies normal and triple captain multipliers cleanly", () => {
    assert.equal(getCaptainMultiplier(), 2);
    assert.equal(getCaptainMultiplier({ chipType: "TRIPLE_CAPTAIN" }), 3);
  });

  it("calculates lineup gross points with captain multiplier and missing performance as zero", () => {
    const points = calculateLineupGrossPoints(
      {
        captainId: "player-b",
        players: [
          { playerId: "player-a" },
          { playerId: "player-b" },
          { playerId: "missing-player" },
        ],
      },
      [
        { playerId: "player-a", fantasyPoints: 40 },
        { playerId: "player-b", fantasyPoints: 65 },
      ],
    );

    assert.equal(points, 170);
  });

  it("is idempotent and reflects corrected player performance inputs", () => {
    const lineup = {
      captainId: "player-a",
      players: [{ playerId: "player-a" }, { playerId: "player-b" }],
    };
    const performances = [
      { playerId: "player-a", fantasyPoints: 25 },
      { playerId: "player-b", fantasyPoints: 15 },
    ];

    assert.equal(
      calculateLineupGrossPoints(lineup, performances),
      calculateLineupGrossPoints(lineup, performances),
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        didBat: true,
        runs: 52,
        wickets: 3,
      }),
      152,
    );
    assert.equal(
      calculatePlayerFantasyPoints({
        ...basePerformance,
        didBat: true,
        runs: 52,
        wickets: 2,
      }),
      112,
    );
  });
});
