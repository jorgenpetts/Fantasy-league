import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlayerPosition } from "@prisma/client";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import { AppError } from "../utils/AppError.js";
import { validateSquadPlayers } from "./squadValidation.service.js";

function player(
  id: string,
  position: PlayerPosition,
  price = 9_000_000,
  active = true,
) {
  return { id, position, price, active };
}

function validSquad(price = 9_000_000) {
  return [
    player("wk-1", PlayerPosition.WICKET_KEEPER, price),
    player("bat-1", PlayerPosition.BATTER, price),
    player("bat-2", PlayerPosition.BATTER, price),
    player("bat-3", PlayerPosition.BATTER, price),
    player("bat-4", PlayerPosition.BATTER, price),
    player("ar-1", PlayerPosition.ALL_ROUNDER, price),
    player("ar-2", PlayerPosition.ALL_ROUNDER, price),
    player("bowl-1", PlayerPosition.BOWLER, price),
    player("bowl-2", PlayerPosition.BOWLER, price),
    player("bowl-3", PlayerPosition.BOWLER, price),
    player("bowl-4", PlayerPosition.BOWLER, price),
  ];
}

function expectValidationError(fn: () => void) {
  assert.throws(fn, AppError);
}

describe("squad validation", () => {
  it("enforces the exact R109,999,999 / R110,000,000 / R110,000,001 boundaries", () => {
    for (const difference of [-1, 0, 1]) {
      const squad = validSquad(10_000_000);
      squad[0]!.price += difference;
      if (difference > 0) expectValidationError(() => validateSquadPlayers(squad, "wk-1"));
      else validateSquadPlayers(squad, "wk-1");
    }
  });
  it("accepts a valid 11-player squad at and below budget", () => {
    validateSquadPlayers(validSquad(10_000_000), "wk-1");

    const exactBudgetSquad = validSquad();
    exactBudgetSquad[0] = player("wk-1", PlayerPosition.WICKET_KEEPER, 20_000_000);

    assert.equal(
      exactBudgetSquad.reduce((total, squadPlayer) => total + squadPlayer.price, 0),
      FANTASY_RULES.squad.budget,
    );

    validateSquadPlayers(exactBudgetSquad, "wk-1");
  });

  it("rejects invalid squad sizes", () => {
    expectValidationError(() => validateSquadPlayers(validSquad().slice(0, 10), "wk-1"));
    expectValidationError(() =>
      validateSquadPlayers(
        [...validSquad(), player("extra", PlayerPosition.BOWLER)],
        "wk-1",
      ),
    );
  });

  it("rejects wrong position counts", () => {
    const noKeeper = validSquad().map((squadPlayer) =>
      squadPlayer.id === "wk-1"
        ? player("wk-1", PlayerPosition.BATTER)
        : squadPlayer,
    );
    const twoKeepers = validSquad().map((squadPlayer) =>
      squadPlayer.id === "bat-1"
        ? player("bat-1", PlayerPosition.WICKET_KEEPER)
        : squadPlayer,
    );
    const wrongAllRounders = validSquad().map((squadPlayer) =>
      squadPlayer.id === "ar-1"
        ? player("ar-1", PlayerPosition.BOWLER)
        : squadPlayer,
    );

    expectValidationError(() => validateSquadPlayers(noKeeper, "wk-1"));
    expectValidationError(() => validateSquadPlayers(twoKeepers, "wk-1"));
    expectValidationError(() => validateSquadPlayers(wrongAllRounders, "wk-1"));
  });

  it("rejects over-budget, duplicate, inactive, and captain-outside-squad cases", () => {
    expectValidationError(() => validateSquadPlayers(validSquad(11_000_000), "wk-1"));

    const duplicate = validSquad();
    duplicate[1] = { ...duplicate[0] };
    expectValidationError(() => validateSquadPlayers(duplicate, "wk-1"));

    const inactive = validSquad();
    inactive[0] = player("wk-1", PlayerPosition.WICKET_KEEPER, 9_000_000, false);
    expectValidationError(() => validateSquadPlayers(inactive, "wk-1"));

    expectValidationError(() => validateSquadPlayers(validSquad(), "not-selected"));
  });
});
