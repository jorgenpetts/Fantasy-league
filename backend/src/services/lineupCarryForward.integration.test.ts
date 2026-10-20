import assert from "node:assert/strict";
import { after, before, it } from "node:test";
import { ChipType, PlayerPosition, RoundStatus, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { activateChip } from "./chip.service.js";
import { createFantasyTeam } from "./fantasyTeam.service.js";
import { getLineup, getPermittedLineupsForTeam, saveLineup } from "./lineup.service.js";
import { ensureRoundLineup, initializeRoundLineups } from "./lineupCarryForward.service.js";
import { bulkUpsertPerformances, recalculateRound } from "./performance.service.js";
import { createRound, updateRound } from "./round.service.js";
import { getRoundLeaderboard } from "./leaderboard.service.js";

const marker = `carry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ids = new Map<string, string>();
const users = { owner: "", inactive: "", existing: "", untouched: "" };
const teams = { owner: "", inactive: "", existing: "", untouched: "" };
let seasonId = "";

function future(days: number) {
  return new Date(Date.now() + days * 86_400_000);
}

function player(name: string) {
  const id = ids.get(name);
  if (!id) throw new Error(`Missing test player ${name}`);
  return id;
}

function originalSquad() {
  return ["wk1", "bat1", "bat2", "bat3", "bat4", "ar1", "ar2", "bowl1", "bowl2", "bowl3", "bowl4"].map(player);
}

function fourTransferSquad() {
  return ["wk1", "bat5", "bat2", "bat3", "bat4", "ar3", "ar2", "bowl5", "bowl6", "bowl3", "bowl4"].map(player);
}

async function round(number: number, deadline: Date) {
  return (await createRound({
    seasonId,
    roundNumber: number,
    name: `${marker} round ${number}`,
    deadline,
    status: RoundStatus.UPCOMING,
  })).id;
}

before(async () => {
  const ownerRows = await Promise.all(
    Object.keys(users).map((key) => prisma.user.create({
      data: {
        email: `${marker}-${key}@example.com`,
        name: `${marker} ${key}`,
        passwordHash: "unused",
        role: UserRole.USER,
      },
    })),
  );
  for (const [index, key] of Object.keys(users).entries()) users[key as keyof typeof users] = ownerRows[index].id;

  seasonId = (await prisma.season.create({
    data: {
      name: marker,
      startDate: new Date(Date.now() - 86_400_000),
      endDate: future(60),
      active: false,
    },
  })).id;

  const playerSpecs: [string, PlayerPosition][] = [
    ["wk1", PlayerPosition.WICKET_KEEPER],
    ...["bat1", "bat2", "bat3", "bat4", "bat5"].map((name): [string, PlayerPosition] => [name, PlayerPosition.BATTER]),
    ...["ar1", "ar2", "ar3"].map((name): [string, PlayerPosition] => [name, PlayerPosition.ALL_ROUNDER]),
    ...["bowl1", "bowl2", "bowl3", "bowl4", "bowl5", "bowl6"].map((name): [string, PlayerPosition] => [name, PlayerPosition.BOWLER]),
  ];
  const playerRows = await Promise.all(playerSpecs.map(([name, position]) =>
    prisma.cricketPlayer.create({
      data: { firstName: marker, lastName: name, position, price: 9_000_000 },
    }),
  ));
  playerRows.forEach((row) => ids.set(row.lastName, row.id));

  for (const key of Object.keys(teams) as (keyof typeof teams)[]) {
    teams[key] = (await createFantasyTeam(users[key], {
      name: `${marker} ${key} team`,
      seasonId,
    })).id;
  }
});

after(async () => {
  if (seasonId) await prisma.season.delete({ where: { id: seasonId } });
  await prisma.cricketPlayer.deleteMany({ where: { firstName: marker } });
  await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
});

it("carries independent snapshots through the round lifecycle without a user visit", async () => {
  const round1 = await round(1, future(1));
  assert.equal((await initializeRoundLineups(round1)).created, 0);
  assert.equal(await ensureRoundLineup(teams.owner, round1), null);

  await saveLineup(teams.owner, round1, users.owner, {
    playerIds: originalSquad(), captainId: player("bat1"),
  });
  await saveLineup(teams.existing, round1, users.existing, {
    playerIds: originalSquad(), captainId: player("wk1"),
  });
  await saveLineup(teams.untouched, round1, users.untouched, {
    playerIds: originalSquad(), captainId: player("wk1"),
  });
  await activateChip(teams.owner, round1, users.owner, ChipType.TRIPLE_CAPTAIN);
  await activateChip(teams.existing, round1, users.existing, ChipType.WILDCARD);

  const round2 = await round(2, future(2));
  assert.equal(await ensureRoundLineup(teams.owner, round2), null);
  await saveLineup(teams.existing, round2, users.existing, {
    playerIds: originalSquad(), captainId: player("bat2"),
  });
  const protectedId = (await prisma.fantasyLineup.findUniqueOrThrow({
    where: { fantasyTeamId_roundId: { fantasyTeamId: teams.existing, roundId: round2 } },
  })).id;

  // Final selections can carry even before performance entry is complete.
  await updateRound(round1, { status: RoundStatus.LOCKED });
  const summary = await initializeRoundLineups(round2);
  assert.equal(summary.created, 0);
  assert.equal(summary.alreadyExisting, 3);
  assert.equal(summary.noPreviousLineup, 1);
  await bulkUpsertPerformances(round1, {
    performances: [{
      playerId: player("wk1"), didBat: true, notOut: false,
      runs: 20, ballsFaced: 15, wickets: 0, runsConceded: 0,
      ballsBowled: 0, maidens: 0, catches: 0, droppedCatches: 0,
      stumpings: 0, runOuts: 0,
    }],
  });
  await updateRound(round1, { status: RoundStatus.COMPLETED });

  const previous = await prisma.fantasyLineup.findUniqueOrThrow({
    where: { fantasyTeamId_roundId: { fantasyTeamId: teams.owner, roundId: round1 } },
    include: { players: true },
  });
  const current = await prisma.fantasyLineup.findUniqueOrThrow({
    where: { fantasyTeamId_roundId: { fantasyTeamId: teams.owner, roundId: round2 } },
    include: { players: true },
  });
  assert.notEqual(current.id, previous.id);
  assert.deepEqual(current.players.map((row) => row.playerId).sort(), previous.players.map((row) => row.playerId).sort());
  assert.equal(current.players.length, 11);
  assert.equal(new Set([...previous.players, ...current.players].map((row) => row.id)).size, 22);
  assert.equal(current.captainId, previous.captainId);
  assert.equal(current.grossPoints, 0);
  assert.equal(current.roundPoints, 0);
  assert.equal(current.transfersMade, 0);
  assert.equal(current.transferPenalty, 0);
  assert.equal(await prisma.lineupTransferSummary.count({ where: { lineupId: current.id } }), 0);
  assert.equal(await prisma.chipUsage.count({ where: { fantasyTeamId: teams.owner, roundId: round2 } }), 0);
  assert.equal(await prisma.chipUsage.count({ where: { fantasyTeamId: teams.existing, roundId: round2 } }), 0);
  assert.equal(await prisma.fantasyLineup.count({ where: { fantasyTeamId: teams.inactive, roundId: round2 } }), 0);
  assert.equal((await prisma.fantasyLineup.findUniqueOrThrow({
    where: { fantasyTeamId_roundId: { fantasyTeamId: teams.existing, roundId: round2 } },
  })).id, protectedId);

  const ownerView = await getLineup(teams.owner, round2, users.owner);
  const hiddenView = await getLineup(teams.owner, round2, users.inactive);
  assert.ok("players" in ownerView);
  assert.equal("lineupLockedForViewing" in hiddenView, true);

  const oneChange = [...originalSquad()];
  oneChange[7] = player("bowl5");
  const savedOne = await saveLineup(teams.owner, round2, users.owner, {
    playerIds: oneChange, captainId: player("bat2"),
  });
  assert.equal(savedOne.transfers.transfersMade, 1);
  assert.equal(savedOne.transfers.transferPenalty, 0);
  const savedFour = await saveLineup(teams.owner, round2, users.owner, {
    playerIds: fourTransferSquad(), captainId: player("bat2"),
  });
  assert.equal(savedFour.transfers.transfersMade, 4);
  assert.equal(savedFour.transfers.extraTransfers, 1);
  assert.equal(savedFour.transfers.transferPenalty, 4);
  await activateChip(teams.owner, round2, users.owner, ChipType.WILDCARD);
  const wildcard = await saveLineup(teams.owner, round2, users.owner, {
    playerIds: fourTransferSquad(), captainId: player("bat2"),
  });
  assert.equal(wildcard.transfers.transfersMade, 4);
  assert.equal(wildcard.transfers.transferPenalty, 0);

  const unchangedPrevious = await prisma.fantasyLineup.findUniqueOrThrow({
    where: { id: previous.id }, include: { players: true },
  });
  assert.equal(unchangedPrevious.captainId, player("bat1"));
  assert.deepEqual(unchangedPrevious.players.map((row) => row.playerId).sort(), originalSquad().sort());

  await updateRound(round2, { status: RoundStatus.LOCKED, deadline: new Date(Date.now() - 60_000) });
  await assert.rejects(saveLineup(teams.owner, round2, users.owner, {
    playerIds: originalSquad(), captainId: player("bat1"),
  }), /locked/);
  const visibleView = await getLineup(teams.owner, round2, users.inactive);
  assert.ok("players" in visibleView);

  // The untouched, carried lineup is included in normal scoring.
  const scoring = await bulkUpsertPerformances(round2, {
    performances: [{
      playerId: player("wk1"), didBat: true, notOut: false,
      runs: 20, ballsFaced: 15, wickets: 0, runsConceded: 0,
      ballsBowled: 0, maidens: 0, catches: 0, droppedCatches: 0,
      stumpings: 0, runOuts: 0,
    }],
  });
  assert.equal(scoring.lineupsProcessed, 3);
  const scoredUntouched = await prisma.fantasyLineup.findUniqueOrThrow({
    where: { fantasyTeamId_roundId: { fantasyTeamId: teams.untouched, roundId: round2 } },
  });
  assert.ok(scoredUntouched.roundPoints > 0);
  const leaderboard = await getRoundLeaderboard(round2, seasonId);
  assert.equal(
    leaderboard.entries.find((entry) => entry.fantasyTeamId === teams.untouched)?.roundPoints,
    scoredUntouched.roundPoints,
  );
  const history = await getPermittedLineupsForTeam(teams.owner, users.owner, {});
  const firstHistory = history.find((entry) => entry.round.id === round1);
  const secondHistory = history.find((entry) => entry.round.id === round2);
  assert.ok(firstHistory && "players" in firstHistory);
  assert.ok(secondHistory && "players" in secondHistory);
  assert.equal(firstHistory.captainId, player("bat1"));
  assert.equal(firstHistory.activeChip, ChipType.TRIPLE_CAPTAIN);
  assert.equal(secondHistory.captainId, player("bat2"));
  assert.equal(secondHistory.activeChip, ChipType.WILDCARD);
  assert.equal(secondHistory.transfers.transfersMade, 4);
  assert.equal(secondHistory.transfers.transferPenalty, 0);

  await updateRound(round2, { status: RoundStatus.COMPLETED });
  const round3 = await round(3, future(3));
  const carriedAgain = await prisma.fantasyLineup.findUniqueOrThrow({
    where: { fantasyTeamId_roundId: { fantasyTeamId: teams.owner, roundId: round3 } },
  });
  assert.equal(carriedAgain.captainId, player("bat2"));
  assert.equal(carriedAgain.roundPoints, 0);
  assert.equal(carriedAgain.transferPenalty, 0);
  assert.equal(await prisma.chipUsage.count({ where: { fantasyTeamId: teams.owner, roundId: round3 } }), 0);

  await Promise.all([initializeRoundLineups(round3), initializeRoundLineups(round3)]);
  assert.equal(await prisma.fantasyLineup.count({ where: { fantasyTeamId: teams.owner, roundId: round3 } }), 1);
  assert.equal(await prisma.fantasyLineupPlayer.count({ where: { lineupId: carriedAgain.id } }), 11);
  assert.equal(await prisma.lineupTransferSummary.count({ where: { lineupId: carriedAgain.id } }), 0);

  const round4 = await round(4, future(4));
  assert.equal(await ensureRoundLineup(teams.owner, round4), null);
  await updateRound(round3, { status: RoundStatus.COMPLETED });
  assert.equal((await initializeRoundLineups(round4)).alreadyExisting, 3);
  assert.equal(await prisma.fantasyLineup.count({ where: { roundId: round4 } }), 3);

  const missing = await prisma.fantasyLineup.findUniqueOrThrow({
    where: { fantasyTeamId_roundId: { fantasyTeamId: teams.owner, roundId: round4 } },
  });
  await prisma.fantasyLineup.delete({ where: { id: missing.id } });
  const recovered = await ensureRoundLineup(teams.owner, round4);
  assert.ok(recovered);
  assert.notEqual(recovered.id, missing.id);
  assert.equal(await prisma.fantasyLineupPlayer.count({ where: { lineupId: recovered.id } }), 11);
});

it("carries an unchanged team when the admin creates the next round", async () => {
  const season = await prisma.season.create({
    data: { name: `${marker} creation trigger`, startDate: new Date(), endDate: future(10) },
  });
  try {
    const team = await createFantasyTeam(users.owner, {
      name: `${marker} creation team`, seasonId: season.id,
    });
    const first = await createRound({
      seasonId: season.id, roundNumber: 1, name: `${marker} creation first`,
      deadline: future(1), status: RoundStatus.UPCOMING,
    });
    await saveLineup(team.id, first.id, users.owner, {
      playerIds: originalSquad(), captainId: player("bat1"),
    });
    await updateRound(first.id, { status: RoundStatus.LOCKED });

    // Creating Round 2 is the only action after Round 1 is locked.
    const second = await createRound({
      seasonId: season.id, roundNumber: 2, name: `${marker} creation second`,
      deadline: future(2), status: RoundStatus.UPCOMING,
    });
    const carried = await prisma.fantasyLineup.findUniqueOrThrow({
      where: { fantasyTeamId_roundId: { fantasyTeamId: team.id, roundId: second.id } },
      include: { players: true },
    });
    assert.deepEqual(carried.players.map(({ playerId }) => playerId).sort(), originalSquad().sort());
    assert.equal(carried.captainId, player("bat1"));
    assert.equal(carried.roundPoints, 0);
    assert.equal((await initializeRoundLineups(second.id)).alreadyExisting, 1);
    assert.equal(await prisma.fantasyLineup.count({ where: { fantasyTeamId: team.id, roundId: second.id } }), 1);
  } finally {
    await prisma.season.delete({ where: { id: season.id } });
  }
});

it("scores saved lineups without filling gaps in locked rounds", async () => {
  const season = await prisma.season.create({
    data: { name: `${marker} no backfill`, startDate: new Date(), endDate: future(10) },
  });
  try {
    const owner = await createFantasyTeam(users.owner, { name: `${marker} owner`, seasonId: season.id });
    const existing = await createFantasyTeam(users.existing, { name: `${marker} existing`, seasonId: season.id });
    const first = await prisma.round.create({ data: {
      seasonId: season.id, roundNumber: 1, name: `${marker} first`, deadline: future(1),
    } });
    await saveLineup(owner.id, first.id, users.owner, {
      playerIds: originalSquad(), captainId: player("wk1"),
    });
    await saveLineup(existing.id, first.id, users.existing, {
      playerIds: originalSquad(), captainId: player("wk1"),
    });
    const second = await prisma.round.create({ data: {
      seasonId: season.id, roundNumber: 2, name: `${marker} second`, deadline: future(2),
    } });
    const saved = await saveLineup(existing.id, second.id, users.existing, {
      playerIds: originalSquad(), captainId: player("wk1"),
    });
    await prisma.round.update({ where: { id: second.id }, data: { status: RoundStatus.LOCKED } });
    await updateRound(first.id, { status: RoundStatus.LOCKED });
    await prisma.playerPerformance.create({ data: {
      playerId: player("wk1"), roundId: second.id, didBat: true, runs: 20, ballsFaced: 15,
    } });

    assert.equal((await initializeRoundLineups(second.id)).created, 0);
    assert.equal(await ensureRoundLineup(owner.id, second.id), null);
    assert.equal((await recalculateRound(second.id)).lineupsProcessed, 1);
    const scored = await prisma.fantasyLineup.findUniqueOrThrow({ where: { id: saved.id } });
    assert.ok(scored.roundPoints > 0);
    assert.equal((await recalculateRound(second.id)).lineupsProcessed, 1);
    assert.equal((await prisma.fantasyLineup.findUniqueOrThrow({ where: { id: saved.id } })).roundPoints,
      scored.roundPoints);
    assert.equal((await prisma.fantasyTeam.findUniqueOrThrow({ where: { id: existing.id } })).totalPoints,
      scored.roundPoints);
    assert.equal((await prisma.fantasyTeam.findUniqueOrThrow({ where: { id: owner.id } })).totalPoints, 0);
    assert.equal(await prisma.fantasyLineup.count({ where: { roundId: second.id } }), 1);
  } finally {
    await prisma.season.delete({ where: { id: season.id } });
  }
});

it("does not carry into a round after its deadline, including for late entrants", async () => {
  const season = await prisma.season.create({
    data: { name: `${marker} closed round`, startDate: new Date(), endDate: future(10) },
  });
  try {
    const owner = await createFantasyTeam(users.owner, { name: `${marker} owner`, seasonId: season.id });
    const first = await prisma.round.create({ data: {
      seasonId: season.id, roundNumber: 1, name: `${marker} first`, deadline: future(1),
    } });
    await saveLineup(owner.id, first.id, users.owner, {
      playerIds: originalSquad(), captainId: player("wk1"),
    });
    await prisma.round.update({ where: { id: first.id }, data: { status: RoundStatus.COMPLETED } });
    const closed = await prisma.round.create({ data: {
      seasonId: season.id, roundNumber: 2, name: `${marker} closed`,
      deadline: new Date(Date.now() - 60_000), status: RoundStatus.UPCOMING,
    } });
    const late = await createFantasyTeam(users.inactive, {
      name: `${marker} late entrant`, seasonId: season.id,
    });
    assert.equal((await initializeRoundLineups(closed.id)).created, 0);
    assert.equal(await ensureRoundLineup(owner.id, closed.id), null);
    assert.equal(await ensureRoundLineup(late.id, closed.id), null);
    assert.equal((await recalculateRound(closed.id)).lineupsProcessed, 0);
    assert.equal(await prisma.fantasyLineup.count({ where: { roundId: closed.id } }), 0);
    assert.equal((await prisma.fantasyTeam.findUniqueOrThrow({ where: { id: late.id } })).totalPoints, 0);
  } finally {
    await prisma.season.delete({ where: { id: season.id } });
  }
});
