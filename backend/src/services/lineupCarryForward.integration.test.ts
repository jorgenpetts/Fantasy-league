import assert from "node:assert/strict";
import { after, before, it } from "node:test";
import { ChipType, PlayerPosition, RoundStatus, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { activateChip } from "./chip.service.js";
import { createFantasyTeam } from "./fantasyTeam.service.js";
import { getLineup, getPermittedLineupsForTeam, saveLineup } from "./lineup.service.js";
import { ensureRoundLineup, initializeRoundLineups } from "./lineupCarryForward.service.js";
import { bulkUpsertPerformances } from "./performance.service.js";
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

  // Admin locks Round 1. This initializes Round 2 for every eligible team,
  // including an owner who never opens the new round.
  await updateRound(round1, { status: RoundStatus.LOCKED });
  const summary = await initializeRoundLineups(round2);
  assert.equal(summary.created, 0);
  assert.equal(summary.alreadyExisting, 3);
  assert.equal(summary.noPreviousLineup, 1);

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
  await prisma.round.update({
    where: { id: round3 },
    data: { deadline: new Date(Date.now() - 60_000) },
  });
  assert.equal((await initializeRoundLineups(round4)).created, 3);
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

it("does not cross seasons or skip a missing immediate previous round", async () => {
  const newSeason = await prisma.season.create({
    data: {
      name: `${marker} second season`,
      startDate: future(70),
      endDate: future(130),
      active: false,
    },
  });
  try {
    const newTeam = await createFantasyTeam(users.owner, {
      name: `${marker} new season team`,
      seasonId: newSeason.id,
    });
    const first = await prisma.round.create({
      data: {
        seasonId: newSeason.id,
        roundNumber: 1,
        name: `${marker} new first round`,
        deadline: future(71),
      },
    });
    assert.equal((await initializeRoundLineups(first.id)).created, 0);
    assert.equal(await ensureRoundLineup(newTeam.id, first.id), null);

    await saveLineup(newTeam.id, first.id, users.owner, {
      playerIds: originalSquad(), captainId: player("bat1"),
    });
    await prisma.round.update({
      where: { id: first.id },
      data: { status: RoundStatus.LOCKED },
    });
    const second = await prisma.round.create({
      data: {
        seasonId: newSeason.id,
        roundNumber: 2,
        name: `${marker} missing round`,
        deadline: future(72),
        status: RoundStatus.LOCKED,
      },
    });
    const third = await prisma.round.create({
      data: {
        seasonId: newSeason.id,
        roundNumber: 3,
        name: `${marker} third round`,
        deadline: future(73),
      },
    });
    assert.equal((await initializeRoundLineups(third.id)).created, 0);
    assert.equal(await ensureRoundLineup(newTeam.id, third.id), null);
    assert.equal(await prisma.fantasyLineup.count({ where: { roundId: second.id } }), 0);
    assert.equal(await prisma.fantasyLineup.count({ where: { roundId: third.id } }), 0);
  } finally {
    await prisma.season.delete({ where: { id: newSeason.id } });
  }
});
