import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FantasyRules, Player, PlayerPosition } from "../../types/api.ts";
import {
  calculateProjectedTransfers,
  validateDraft,
} from "./utils.ts";

const rules: FantasyRules = {
  squad: {
    size: 11,
    budget: 110_000_000,
    positions: {
      WICKET_KEEPER: 1,
      BATTER: 4,
      ALL_ROUNDER: 2,
      BOWLER: 4,
    },
  },
  transfers: {
    freePerRound: 3,
    extraTransferPenalty: 4,
  },
  chips: {
    perSeason: { WILDCARD: 1, TRIPLE_CAPTAIN: 1 },
  },
  scoring: {},
};

function player(
  id: string,
  position: PlayerPosition,
  price = 10_000_000,
  active = true,
): Player {
  return {
    id,
    firstName: "Player",
    lastName: id,
    position,
    price,
    active,
  };
}

function validSquad(price = 10_000_000) {
  return [
    player("wk", "WICKET_KEEPER", price),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`bat-${index}`, "BATTER", price),
    ),
    ...Array.from({ length: 2 }, (_, index) =>
      player(`ar-${index}`, "ALL_ROUNDER", price),
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      player(`bowl-${index}`, "BOWLER", price),
    ),
  ];
}

describe("team builder draft validation", () => {
  it("accepts the fixed formation at exactly R110m", () => {
    const squad = validSquad();
    const result = validateDraft(squad, "wk", rules);

    assert.equal(result.isValid, true);
    assert.equal(result.squadValue, 110_000_000);
    assert.equal(result.remainingBudget, 0);
  });

  it("rejects incomplete, over-budget, inactive, and invalid-captain drafts", () => {
    const incomplete = validSquad().slice(0, 10);
    assert.equal(validateDraft(incomplete, "wk", rules).isValid, false);

    const expensive = validSquad(10_000_001);
    assert.equal(validateDraft(expensive, "wk", rules).isValid, false);

    const inactive = validSquad();
    inactive[0] = { ...inactive[0]!, active: false };
    assert.equal(validateDraft(inactive, "wk", rules).isValid, false);

    assert.equal(validateDraft(validSquad(), "outside", rules).isValid, false);
  });
});

describe("team builder transfer preview", () => {
  const previous = Array.from({ length: 11 }, (_, index) => `player-${index}`);

  it("counts incoming players and applies the three-free-transfer threshold", () => {
    const threeChanges = [...previous.slice(0, 8), "new-a", "new-b", "new-c"];
    const fiveChanges = [
      ...previous.slice(0, 6),
      "new-a",
      "new-b",
      "new-c",
      "new-d",
      "new-e",
    ];

    assert.deepEqual(
      calculateProjectedTransfers(previous, threeChanges, rules, false),
      {
        transfersMade: 3,
        freeTransfers: 3,
        extraTransfers: 0,
        transferPenalty: 0,
      },
    );
    assert.equal(
      calculateProjectedTransfers(previous, fiveChanges, rules, false)
        .transferPenalty,
      8,
    );
  });

  it("keeps the transfer count but removes the penalty with Wildcard", () => {
    const draft = Array.from({ length: 11 }, (_, index) => `new-${index}`);
    const result = calculateProjectedTransfers(previous, draft, rules, true);

    assert.equal(result.transfersMade, 11);
    assert.equal(result.transferPenalty, 0);
  });

  it("treats a first squad with no previous lineup as zero transfers", () => {
    const result = calculateProjectedTransfers(null, previous, rules, false);

    assert.equal(result.transfersMade, 0);
    assert.equal(result.transferPenalty, 0);
  });
});
