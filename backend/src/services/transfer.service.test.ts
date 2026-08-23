import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ChipType } from "@prisma/client";
import { calculateTransfers } from "./transfer.service.js";

const previous = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

function currentWithChanges(count: number) {
  return [
    ...previous.slice(0, previous.length - count),
    ...Array.from({ length: count }, (_, index) => `IN-${index}`),
  ];
}

describe("transfer calculation", () => {
  it("counts only players brought in", () => {
    assert.equal(calculateTransfers([], previous).transfersMade, 11);
    assert.equal(calculateTransfers(previous, previous).transfersMade, 0);
    assert.equal(calculateTransfers(previous, currentWithChanges(1)).transfersMade, 1);
    assert.equal(calculateTransfers(previous, currentWithChanges(3)).transfersMade, 3);
    assert.equal(calculateTransfers(previous, currentWithChanges(4)).transfersMade, 4);
    assert.equal(calculateTransfers(previous, currentWithChanges(11)).transfersMade, 11);
  });

  it("applies three free transfers and positive penalty magnitude", () => {
    assert.equal(calculateTransfers(previous, currentWithChanges(0)).transferPenalty, 0);
    assert.equal(calculateTransfers(previous, currentWithChanges(1)).transferPenalty, 0);
    assert.equal(calculateTransfers(previous, currentWithChanges(2)).transferPenalty, 0);
    assert.equal(calculateTransfers(previous, currentWithChanges(3)).transferPenalty, 0);
    assert.equal(calculateTransfers(previous, currentWithChanges(4)).transferPenalty, 4);
    assert.equal(calculateTransfers(previous, currentWithChanges(5)).transferPenalty, 8);
    assert.equal(calculateTransfers(previous, currentWithChanges(6)).transferPenalty, 12);
  });

  it("keeps transfer count but zeroes penalty with Wildcard", () => {
    const transfers = calculateTransfers(
      previous,
      currentWithChanges(8),
      ChipType.WILDCARD,
    );

    assert.equal(transfers.transfersMade, 8);
    assert.equal(transfers.transferPenalty, 0);
    assert.equal(transfers.wildcardActive, true);
  });
});
