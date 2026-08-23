import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ChipType, PlayerPosition, RoundStatus, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { performanceStatsSchema } from "../validators/performance.validator.js";
import { createFantasyTeam } from "./fantasyTeam.service.js";
import { getLineup, saveLineup } from "./lineup.service.js";
import { bulkUpsertPerformances, recalculateRound } from "./performance.service.js";
import { activateChip } from "./chip.service.js";
import { getOverallLeaderboard, getRoundLeaderboard } from "./leaderboard.service.js";

const marker = `audit-${Date.now()}`;

const users = {
  owner: { id: "", email: `${marker}-owner@example.com` },
  other: { id: "", email: `${marker}-other@example.com` },
};

const state = {
  seasonId: "",
  teamId: "",
  otherTeamId: "",
  rounds: [] as string[],
  players: new Map<string, string>(),
};

const baseStats = {
  didBat: true,
  runs: 10,
  ballsFaced: 10,
  wickets: 0,
  runsConceded: 0,
  ballsBowled: 0,
  catches: 0,
  droppedCatches: 0,
  stumpings: 0,
  runOuts: 0,
};

function id(key: string) {
  const value = state.players.get(key);

  if (!value) {
    throw new Error(`Missing test player ${key}`);
  }

  return value;
}

function performance(playerKey: string, runs = 10) {
  return {
    playerId: id(playerKey),
    ...baseStats,
    runs,
  };
}

async function createPlayer(key: string, position: PlayerPosition) {
  const player = await prisma.cricketPlayer.create({
    data: {
      firstName: marker,
      lastName: key,
      position,
      price: 9_000_000,
      active: true,
    },
  });

  state.players.set(key, player.id);
}

async function createRound(roundNumber: number, deadline: Date) {
  const round = await prisma.round.create({
    data: {
      seasonId: state.seasonId,
      roundNumber,
      name: `${marker} Round ${roundNumber}`,
      deadline,
      status: RoundStatus.UPCOMING,
    },
  });

  state.rounds.push(round.id);
  return round.id;
}

function initialSquad() {
  return [
    id("wk1"),
    id("bat1"),
    id("bat2"),
    id("bat3"),
    id("bat4"),
    id("ar1"),
    id("ar2"),
    id("bowl1"),
    id("bowl2"),
    id("bowl3"),
    id("bowl4"),
  ];
}

function roundTwoSquad() {
  return [
    id("wk2"),
    id("bat5"),
    id("bat6"),
    id("bat3"),
    id("bat4"),
    id("ar3"),
    id("ar2"),
    id("bowl5"),
    id("bowl2"),
    id("bowl3"),
    id("bowl4"),
  ];
}

function futureDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function lockRound(roundId: string) {
  await prisma.round.update({
    where: { id: roundId },
    data: { status: RoundStatus.LOCKED, deadline: new Date(Date.now() - 60_000) },
  });
}

before(async () => {
  await prisma.user.createMany({
    data: [
      {
        email: users.owner.email,
        name: `${marker} Owner`,
        passwordHash: "unused",
        role: UserRole.USER,
      },
      {
        email: users.other.email,
        name: `${marker} Other`,
        passwordHash: "unused",
        role: UserRole.USER,
      },
    ],
  });

  const [owner, other] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: users.owner.email } }),
    prisma.user.findUniqueOrThrow({ where: { email: users.other.email } }),
  ]);

  users.owner.id = owner.id;
  users.other.id = other.id;

  const season = await prisma.season.create({
    data: {
      name: `${marker} Season`,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: futureDate(60),
      active: true,
    },
  });
  state.seasonId = season.id;

  await Promise.all([
    createPlayer("wk1", PlayerPosition.WICKET_KEEPER),
    createPlayer("wk2", PlayerPosition.WICKET_KEEPER),
    createPlayer("bat1", PlayerPosition.BATTER),
    createPlayer("bat2", PlayerPosition.BATTER),
    createPlayer("bat3", PlayerPosition.BATTER),
    createPlayer("bat4", PlayerPosition.BATTER),
    createPlayer("bat5", PlayerPosition.BATTER),
    createPlayer("bat6", PlayerPosition.BATTER),
    createPlayer("ar1", PlayerPosition.ALL_ROUNDER),
    createPlayer("ar2", PlayerPosition.ALL_ROUNDER),
    createPlayer("ar3", PlayerPosition.ALL_ROUNDER),
    createPlayer("bowl1", PlayerPosition.BOWLER),
    createPlayer("bowl2", PlayerPosition.BOWLER),
    createPlayer("bowl3", PlayerPosition.BOWLER),
    createPlayer("bowl4", PlayerPosition.BOWLER),
    createPlayer("bowl5", PlayerPosition.BOWLER),
  ]);

  const team = await createFantasyTeam(users.owner.id, {
    name: `${marker} Team`,
    seasonId: state.seasonId,
  });
  const otherTeam = await createFantasyTeam(users.other.id, {
    name: `${marker} Other Team`,
    seasonId: state.seasonId,
  });

  state.teamId = team.id;
  state.otherTeamId = otherTeam.id;
});

after(async () => {
  await prisma.season.deleteMany({ where: { name: { startsWith: marker } } });
  await prisma.cricketPlayer.deleteMany({
    where: { firstName: marker },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: marker } },
  });
  await prisma.$disconnect();
});

describe("backend fantasy flow integration", () => {
  it("scores historical rounds, transfers, Wildcard, Triple Captain, leaderboards, and privacy", async () => {
    assert.throws(() =>
      performanceStatsSchema.parse({
        ...baseStats,
        fantasyPoints: 999,
      }),
    );

    const round1 = await createRound(1, futureDate(1));
    await saveLineup(state.teamId, round1, users.owner.id, {
      playerIds: initialSquad(),
      captainId: id("wk1"),
    });
    await saveLineup(state.otherTeamId, round1, users.other.id, {
      playerIds: initialSquad(),
      captainId: id("bat1"),
    });

    const ownerView = await getLineup(state.teamId, round1, users.owner.id);
    const hiddenView = await getLineup(state.teamId, round1, users.other.id);
    assert.equal("lineupLockedForViewing" in ownerView, false);
    assert.equal("lineupLockedForViewing" in hiddenView, true);

    await lockRound(round1);
    const visibleView = await getLineup(state.teamId, round1, users.other.id);
    assert.equal("lineupLockedForViewing" in visibleView, false);

    await bulkUpsertPerformances(round1, {
      performances: [
        performance("wk1", 50),
        ...["bat1", "bat2", "bat3", "bat4", "ar1", "ar2", "bowl1", "bowl2", "bowl3", "bowl4"].map((key) =>
          performance(key),
        ),
      ],
    });

    const scoredRound1 = await prisma.fantasyLineup.findUniqueOrThrow({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: state.teamId,
          roundId: round1,
        },
      },
    });
    assert.equal(scoredRound1.grossPoints, 240);
    assert.equal(scoredRound1.transferPenalty, 0);
    assert.equal(scoredRound1.roundPoints, 240);

    await bulkUpsertPerformances(round1, {
      performances: [performance("wk1", 100)],
    });
    const correctedRound1 = await prisma.fantasyLineup.findUniqueOrThrow({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: state.teamId,
          roundId: round1,
        },
      },
    });
    assert.equal(correctedRound1.roundPoints, 380);

    const round2 = await createRound(2, futureDate(2));
    await saveLineup(state.teamId, round2, users.owner.id, {
      playerIds: roundTwoSquad(),
      captainId: id("wk2"),
    });
    await lockRound(round2);
    await bulkUpsertPerformances(round2, {
      performances: [
        performance("wk2", 50),
        ...["bat5", "bat6", "bat3", "bat4", "ar3", "ar2", "bowl5", "bowl2", "bowl3", "bowl4"].map((key) =>
          performance(key),
        ),
      ],
    });
    const scoredRound2 = await prisma.fantasyLineup.findUniqueOrThrow({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: state.teamId,
          roundId: round2,
        },
      },
    });
    assert.equal(scoredRound2.transfersMade, 5);
    assert.equal(scoredRound2.transferPenalty, 8);
    assert.equal(scoredRound2.roundPoints, 232);

    const round3 = await createRound(3, futureDate(3));
    await activateChip(state.teamId, round3, users.owner.id, ChipType.WILDCARD);
    await saveLineup(state.teamId, round3, users.owner.id, {
      playerIds: initialSquad(),
      captainId: id("wk1"),
    });
    await lockRound(round3);
    await bulkUpsertPerformances(round3, {
      performances: [
        performance("wk1", 50),
        ...["bat1", "bat2", "bat3", "bat4", "ar1", "ar2", "bowl1", "bowl2", "bowl3", "bowl4"].map((key) =>
          performance(key),
        ),
      ],
    });
    const wildcardRound = await prisma.fantasyLineup.findUniqueOrThrow({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: state.teamId,
          roundId: round3,
        },
      },
    });
    assert.equal(wildcardRound.transfersMade, 5);
    assert.equal(wildcardRound.transferPenalty, 0);

    const round4 = await createRound(4, futureDate(4));
    await activateChip(
      state.teamId,
      round4,
      users.owner.id,
      ChipType.TRIPLE_CAPTAIN,
    );
    await saveLineup(state.teamId, round4, users.owner.id, {
      playerIds: initialSquad(),
      captainId: id("wk1"),
    });
    await lockRound(round4);
    await bulkUpsertPerformances(round4, {
      performances: [
        performance("wk1", 50),
        ...["bat1", "bat2", "bat3", "bat4", "ar1", "ar2", "bowl1", "bowl2", "bowl3", "bowl4"].map((key) =>
          performance(key),
        ),
      ],
    });
    const tripleCaptainRound = await prisma.fantasyLineup.findUniqueOrThrow({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: state.teamId,
          roundId: round4,
        },
      },
    });
    assert.equal(tripleCaptainRound.grossPoints, 310);
    assert.equal(tripleCaptainRound.roundPoints, 310);

    const firstBeforeRepeat = await prisma.fantasyLineup.findUniqueOrThrow({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: state.teamId,
          roundId: round1,
        },
      },
      include: { players: true },
    });
    await recalculateRound(round1);
    await recalculateRound(round1);
    const firstAfterRepeat = await prisma.fantasyLineup.findUniqueOrThrow({
      where: {
        fantasyTeamId_roundId: {
          fantasyTeamId: state.teamId,
          roundId: round1,
        },
      },
      include: { players: true },
    });
    assert.equal(firstAfterRepeat.roundPoints, firstBeforeRepeat.roundPoints);
    assert.deepEqual(
      firstAfterRepeat.players.map((player) => player.playerId).sort(),
      firstBeforeRepeat.players.map((player) => player.playerId).sort(),
    );

    const team = await prisma.fantasyTeam.findUniqueOrThrow({
      where: { id: state.teamId },
    });
    assert.equal(team.totalPoints, 1162);

    const overallLeaderboard = await getOverallLeaderboard(state.seasonId);
    assert.equal(overallLeaderboard.entries[0]?.fantasyTeamId, state.teamId);
    assert.equal(overallLeaderboard.entries[0]?.rank, 1);

    const roundLeaderboard = await getRoundLeaderboard(round2, state.seasonId);
    assert.equal(roundLeaderboard.entries[0]?.roundPoints, 232);

    const round1PerformanceCount = await prisma.playerPerformance.count({
      where: { roundId: round1, playerId: id("wk1") },
    });
    assert.equal(round1PerformanceCount, 1);
  });
});
