import assert from "node:assert/strict";
import test from "node:test";
import {
  changedFields,
  positiveDatabaseInteger,
  validatePlayer,
  validateRound,
  validateSeason,
} from "./validation.ts";
import {
  dateInputToIso,
  localDateTimeToIso,
  toLocalDateTime,
} from "../../lib/date-time.ts";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test("prices accept exact whole ZAR without rounding, fractions, notation or Int overflow", () => {
  assert.equal(positiveDatabaseInteger("8500000"), 8_500_000);
  for (const invalid of [
    "0",
    "-1",
    "8.5",
    "8500000.1",
    "1e6",
    "",
    "2147483648",
  ])
    assert.equal(positiveDatabaseInteger(invalid), null);
  assert.equal(positiveDatabaseInteger("2147483647"), 2147483647);
  const result = validatePlayer(
    form({
      firstName: " Jo ",
      lastName: " Smith ",
      position: "BATTER",
      price: "8500000",
      active: "on",
    }),
  );
  assert.deepEqual(result.errors, {});
  assert.equal(result.data.firstName, "Jo");
  assert.equal(result.data.price, 8500000);
  assert.equal(result.data.active, true);
  const invalid = validatePlayer(form({ price: "-1", position: "BENCH" }));
  assert.deepEqual(Object.keys(invalid.errors), [
    "firstName",
    "lastName",
    "position",
    "price",
  ]);
});

test("season dates require valid calendar dates and allow equal start/end dates", () => {
  assert.equal(dateInputToIso("2026-02-30"), null);
  assert.equal(dateInputToIso("2026-13-01"), null);
  assert.equal(
    validateSeason(
      form({ name: "Season", startDate: "2026-09-01", endDate: "2026-09-01" }),
    ).data.startDate,
    "2026-09-01T00:00:00.000Z",
  );
  assert.deepEqual(
    validateSeason(
      form({ name: "Season", startDate: "2026-09-01", endDate: "2026-09-01" }),
    ).errors,
    {},
  );
  assert.ok(
    validateSeason(
      form({ name: "Season", startDate: "2026-09-02", endDate: "2026-09-01" }),
    ).errors.endDate,
  );
});

test("round validation rejects missing season, invalid enum, number and deadline", () => {
  const invalid = validateRound(
    form({
      name: "Round",
      roundNumber: "1.5",
      status: "LIVE",
      deadline: "2026-02-30T10:00",
    }),
  );
  for (const field of ["seasonId", "roundNumber", "status", "deadline"])
    assert.ok(invalid.errors[field]);
});

test("local deadlines round-trip in South Africa and other browser timezones", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "Africa/Johannesburg";
    assert.equal(
      localDateTimeToIso("2026-09-28T10:30"),
      "2026-09-28T08:30:00.000Z",
    );
    assert.equal(
      toLocalDateTime("2026-09-28T08:30:05Z"),
      "2026-09-28T10:30:05",
    );
    process.env.TZ = "America/New_York";
    assert.equal(
      localDateTimeToIso("2026-09-28T10:30"),
      "2026-09-28T14:30:00.000Z",
    );
    assert.equal(localDateTimeToIso("2026-03-08T02:30"), null);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("partial updates omit unchanged state and retain false/zero-like changes", () => {
  assert.deepEqual(
    changedFields({ name: "Old", active: true }, { name: "New", active: true }),
    { name: "New" },
  );
  assert.deepEqual(
    changedFields(
      { name: "Old", active: true },
      { name: "Old", active: false },
    ),
    { active: false },
  );
  assert.deepEqual(changedFields({ name: "Old" }, { name: "Old" }), {});
});
