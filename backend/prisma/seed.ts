import bcrypt from "bcrypt";
import {
  ChipType,
  PlayerPosition,
  PrismaClient,
  RoundStatus,
  UserRole,
  type CricketPlayer,
} from "@prisma/client";
import { activateChip } from "../src/services/chip.service.js";
import { saveLineup } from "../src/services/lineup.service.js";
import { bulkUpsertPerformances } from "../src/services/performance.service.js";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";
const SEASON_NAME = "2026/27 Fantasy Cricket";

type PlayerSeed = {
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  price: number;
};

const players: PlayerSeed[] = [
  { firstName: "Ryan", lastName: "Jacobs", position: PlayerPosition.WICKET_KEEPER, price: 10_500_000 },
  { firstName: "Liam", lastName: "Naidoo", position: PlayerPosition.WICKET_KEEPER, price: 8_750_000 },
  { firstName: "Ethan", lastName: "Muller", position: PlayerPosition.WICKET_KEEPER, price: 7_500_000 },
  { firstName: "David", lastName: "Smith", position: PlayerPosition.BATTER, price: 11_000_000 },
  { firstName: "Arjun", lastName: "Patel", position: PlayerPosition.BATTER, price: 10_500_000 },
  { firstName: "Matthew", lastName: "Botha", position: PlayerPosition.BATTER, price: 9_750_000 },
  { firstName: "Caleb", lastName: "Williams", position: PlayerPosition.BATTER, price: 8_500_000 },
  { firstName: "Noah", lastName: "Khan", position: PlayerPosition.BATTER, price: 7_250_000 },
  { firstName: "Thomas", lastName: "Meyer", position: PlayerPosition.BATTER, price: 6_750_000 },
  { firstName: "Oliver", lastName: "Pillay", position: PlayerPosition.BATTER, price: 6_000_000 },
  { firstName: "Jaden", lastName: "Brown", position: PlayerPosition.BATTER, price: 5_500_000 },
  { firstName: "Ruan", lastName: "van Wyk", position: PlayerPosition.ALL_ROUNDER, price: 12_000_000 },
  { firstName: "Sahil", lastName: "Singh", position: PlayerPosition.ALL_ROUNDER, price: 10_500_000 },
  { firstName: "Ben", lastName: "Visser", position: PlayerPosition.ALL_ROUNDER, price: 9_250_000 },
  { firstName: "Musa", lastName: "Dlamini", position: PlayerPosition.ALL_ROUNDER, price: 8_000_000 },
  { firstName: "Daniel", lastName: "Adams", position: PlayerPosition.ALL_ROUNDER, price: 7_500_000 },
  { firstName: "Kyle", lastName: "de Villiers", position: PlayerPosition.BOWLER, price: 10_000_000 },
  { firstName: "Aiden", lastName: "Steyn", position: PlayerPosition.BOWLER, price: 9_500_000 },
  { firstName: "Mohammed", lastName: "Ismail", position: PlayerPosition.BOWLER, price: 8_750_000 },
  { firstName: "Nathan", lastName: "Fourie", position: PlayerPosition.BOWLER, price: 7_750_000 },
  { firstName: "Chris", lastName: "Nkosi", position: PlayerPosition.BOWLER, price: 7_000_000 },
  { firstName: "Josh", lastName: "Pretorius", position: PlayerPosition.BOWLER, price: 6_250_000 },
  { firstName: "Luke", lastName: "Davids", position: PlayerPosition.BOWLER, price: 5_750_000 },
  { firstName: "Sean", lastName: "Mokoena", position: PlayerPosition.BOWLER, price: 5_000_000 },
];

function key(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function upsertPlayer(input: PlayerSeed) {
  const existing = await prisma.cricketPlayer.findFirst({
    where: { firstName: input.firstName, lastName: input.lastName },
  });

  if (existing) {
    return prisma.cricketPlayer.update({
      where: { id: existing.id },
      data: {
        position: input.position,
        price: input.price,
        active: true,
      },
    });
  }

  return prisma.cricketPlayer.create({ data: input });
}

async function upsertRound(
  seasonId: string,
  roundNumber: number,
  name: string,
  deadline: Date,
  status: RoundStatus,
) {
  return prisma.round.upsert({
    where: {
      seasonId_roundNumber: {
        seasonId,
        roundNumber,
      },
    },
    update: {
      name,
      deadline,
      status,
    },
    create: {
      seasonId,
      roundNumber,
      name,
      deadline,
      status,
    },
  });
}

function pick(
  playerMap: Map<string, CricketPlayer>,
  names: string[],
) {
  return names.map((name) => {
    const player = playerMap.get(name);

    if (!player) {
      throw new Error(`Seed player not found: ${name}`);
    }

    return player.id;
  });
}

function stat(
  playerId: string,
  overrides: Partial<{
    didBat: boolean;
    runs: number;
    ballsFaced: number;
    wickets: number;
    runsConceded: number;
    ballsBowled: number;
    catches: number;
    droppedCatches: number;
    stumpings: number;
    runOuts: number;
  }> = {},
) {
  return {
    playerId,
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
    ...overrides,
  };
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Demo Admin",
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: "admin@example.com",
      name: "Demo Admin",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const [jorgen, amara, theo] = await Promise.all(
    [
      ["jorgen@example.com", "Jorgen Demo"],
      ["amara@example.com", "Amara Demo"],
      ["theo@example.com", "Theo Demo"],
    ].map(([email, name]) =>
      prisma.user.upsert({
        where: { email },
        update: { name, passwordHash, role: UserRole.USER },
        create: { email, name, passwordHash, role: UserRole.USER },
      }),
    ),
  );

  const season = await prisma.$transaction(async (tx) => {
    const existingSeason = await tx.season.findFirst({
      where: { name: SEASON_NAME },
      orderBy: { createdAt: "asc" },
    });
    const seasonData = {
      name: SEASON_NAME,
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      endDate: new Date("2027-03-31T23:59:59.000Z"),
      active: true,
    };
    const savedSeason = existingSeason
      ? await tx.season.update({
          where: { id: existingSeason.id },
          data: seasonData,
        })
      : await tx.season.create({ data: seasonData });

    await tx.season.updateMany({
      where: { id: { not: savedSeason.id }, active: true },
      data: { active: false },
    });

    return savedSeason;
  });

  const savedPlayers = await Promise.all(players.map(upsertPlayer));
  const playerMap = new Map(
    savedPlayers.map((player) => [key(player.firstName, player.lastName), player]),
  );

  const [round1, round2, round3, round4] = await Promise.all([
    upsertRound(
      season.id,
      1,
      "Round 1 - Opening Weekend",
      daysFromNow(-21),
      RoundStatus.COMPLETED,
    ),
    upsertRound(
      season.id,
      2,
      "Round 2 - Derby Week",
      daysFromNow(-7),
      RoundStatus.LOCKED,
    ),
    upsertRound(
      season.id,
      3,
      "Round 3 - Current Round",
      daysFromNow(7),
      RoundStatus.UPCOMING,
    ),
    upsertRound(
      season.id,
      4,
      "Round 4 - Triple Captain Demo",
      daysFromNow(21),
      RoundStatus.UPCOMING,
    ),
  ]);

  const [jorgenTeam, amaraTeam, theoTeam] = await Promise.all([
    prisma.fantasyTeam.upsert({
      where: { userId_seasonId: { userId: jorgen.id, seasonId: season.id } },
      update: { name: "Boundary Bashers" },
      create: { userId: jorgen.id, seasonId: season.id, name: "Boundary Bashers" },
    }),
    prisma.fantasyTeam.upsert({
      where: { userId_seasonId: { userId: amara.id, seasonId: season.id } },
      update: { name: "Cover Drive Collective" },
      create: {
        userId: amara.id,
        seasonId: season.id,
        name: "Cover Drive Collective",
      },
    }),
    prisma.fantasyTeam.upsert({
      where: { userId_seasonId: { userId: theo.id, seasonId: season.id } },
      update: { name: "Yorker Yard" },
      create: { userId: theo.id, seasonId: season.id, name: "Yorker Yard" },
    }),
  ]);

  const squadA1 = pick(playerMap, [
    "Ryan Jacobs",
    "David Smith",
    "Arjun Patel",
    "Matthew Botha",
    "Caleb Williams",
    "Ruan van Wyk",
    "Sahil Singh",
    "Kyle de Villiers",
    "Aiden Steyn",
    "Mohammed Ismail",
    "Nathan Fourie",
  ]);
  const squadA2 = pick(playerMap, [
    "Liam Naidoo",
    "David Smith",
    "Noah Khan",
    "Matthew Botha",
    "Caleb Williams",
    "Ben Visser",
    "Sahil Singh",
    "Chris Nkosi",
    "Aiden Steyn",
    "Mohammed Ismail",
    "Nathan Fourie",
  ]);
  const squadA3 = pick(playerMap, [
    "Liam Naidoo",
    "David Smith",
    "Noah Khan",
    "Matthew Botha",
    "Caleb Williams",
    "Ben Visser",
    "Sahil Singh",
    "Chris Nkosi",
    "Aiden Steyn",
    "Mohammed Ismail",
    "Nathan Fourie",
  ]);
  const squadB = pick(playerMap, [
    "Ryan Jacobs",
    "David Smith",
    "Thomas Meyer",
    "Oliver Pillay",
    "Jaden Brown",
    "Ruan van Wyk",
    "Musa Dlamini",
    "Kyle de Villiers",
    "Josh Pretorius",
    "Luke Davids",
    "Sean Mokoena",
  ]);
  const squadC = pick(playerMap, [
    "Ethan Muller",
    "Arjun Patel",
    "Matthew Botha",
    "Noah Khan",
    "Thomas Meyer",
    "Sahil Singh",
    "Daniel Adams",
    "Aiden Steyn",
    "Mohammed Ismail",
    "Luke Davids",
    "Sean Mokoena",
  ]);

  await prisma.round.updateMany({
    where: { id: { in: [round1.id, round2.id] } },
    data: { status: RoundStatus.UPCOMING, deadline: daysFromNow(1) },
  });

  await saveLineup(jorgenTeam.id, round1.id, jorgen.id, {
    playerIds: squadA1,
    captainId: playerMap.get("David Smith")!.id,
  });
  await saveLineup(amaraTeam.id, round1.id, amara.id, {
    playerIds: squadB,
    captainId: playerMap.get("Ruan van Wyk")!.id,
  });
  await saveLineup(theoTeam.id, round1.id, theo.id, {
    playerIds: squadC,
    captainId: playerMap.get("Sahil Singh")!.id,
  });
  await saveLineup(jorgenTeam.id, round2.id, jorgen.id, {
    playerIds: squadA2,
    captainId: playerMap.get("David Smith")!.id,
  });
  await saveLineup(amaraTeam.id, round2.id, amara.id, {
    playerIds: squadB,
    captainId: playerMap.get("Ruan van Wyk")!.id,
  });
  await saveLineup(theoTeam.id, round2.id, theo.id, {
    playerIds: squadC,
    captainId: playerMap.get("Sahil Singh")!.id,
  });

  await activateChip(jorgenTeam.id, round3.id, jorgen.id, ChipType.WILDCARD);
  await saveLineup(jorgenTeam.id, round3.id, jorgen.id, {
    playerIds: squadA3,
    captainId: playerMap.get("David Smith")!.id,
  });
  await saveLineup(amaraTeam.id, round3.id, amara.id, {
    playerIds: squadB,
    captainId: playerMap.get("Ruan van Wyk")!.id,
  });
  await saveLineup(theoTeam.id, round3.id, theo.id, {
    playerIds: squadC,
    captainId: playerMap.get("Sahil Singh")!.id,
  });
  await activateChip(theoTeam.id, round4.id, theo.id, ChipType.TRIPLE_CAPTAIN);

  await prisma.round.update({
    where: { id: round1.id },
    data: { status: RoundStatus.COMPLETED, deadline: daysFromNow(-21) },
  });
  await prisma.round.update({
    where: { id: round2.id },
    data: { status: RoundStatus.LOCKED, deadline: daysFromNow(-7) },
  });

  await bulkUpsertPerformances(round1.id, {
    performances: [
      stat(playerMap.get("Ryan Jacobs")!.id, { didBat: true, runs: 42, ballsFaced: 36, catches: 1 }),
      stat(playerMap.get("David Smith")!.id, { didBat: true, runs: 86, ballsFaced: 64, catches: 1 }),
      stat(playerMap.get("Arjun Patel")!.id, { didBat: true, runs: 0, ballsFaced: 3 }),
      stat(playerMap.get("Matthew Botha")!.id, { didBat: true, runs: 34, ballsFaced: 29 }),
      stat(playerMap.get("Caleb Williams")!.id, { didBat: true, runs: 55, ballsFaced: 48 }),
      stat(playerMap.get("Ruan van Wyk")!.id, { didBat: true, runs: 48, ballsFaced: 41, wickets: 2, runsConceded: 29, ballsBowled: 24 }),
      stat(playerMap.get("Sahil Singh")!.id, { didBat: true, runs: 22, ballsFaced: 18, wickets: 3, runsConceded: 33, ballsBowled: 24 }),
      stat(playerMap.get("Kyle de Villiers")!.id, { wickets: 4, runsConceded: 38, ballsBowled: 24 }),
      stat(playerMap.get("Aiden Steyn")!.id, { wickets: 1, runsConceded: 24, ballsBowled: 18 }),
      stat(playerMap.get("Mohammed Ismail")!.id, { wickets: 0, runsConceded: 56, ballsBowled: 24, droppedCatches: 1 }),
      stat(playerMap.get("Nathan Fourie")!.id, { wickets: 2, runsConceded: 31, ballsBowled: 24, runOuts: 1 }),
    ],
  });

  await bulkUpsertPerformances(round2.id, {
    performances: [
      stat(playerMap.get("Liam Naidoo")!.id, { didBat: true, runs: 61, ballsFaced: 52, catches: 2 }),
      stat(playerMap.get("David Smith")!.id, { didBat: true, runs: 104, ballsFaced: 77 }),
      stat(playerMap.get("Noah Khan")!.id, { didBat: true, runs: 27, ballsFaced: 25 }),
      stat(playerMap.get("Matthew Botha")!.id, { didBat: true, runs: 13, ballsFaced: 19 }),
      stat(playerMap.get("Caleb Williams")!.id, { didBat: true, runs: 49, ballsFaced: 44 }),
      stat(playerMap.get("Ben Visser")!.id, { didBat: true, runs: 18, ballsFaced: 14, wickets: 1, runsConceded: 22, ballsBowled: 18 }),
      stat(playerMap.get("Sahil Singh")!.id, { didBat: true, runs: 9, ballsFaced: 7, wickets: 5, runsConceded: 41, ballsBowled: 24 }),
      stat(playerMap.get("Chris Nkosi")!.id, { wickets: 3, runsConceded: 36, ballsBowled: 24 }),
      stat(playerMap.get("Aiden Steyn")!.id, { wickets: 0, runsConceded: 52, ballsBowled: 24 }),
      stat(playerMap.get("Mohammed Ismail")!.id, { wickets: 2, runsConceded: 30, ballsBowled: 24 }),
      stat(playerMap.get("Nathan Fourie")!.id, { wickets: 1, runsConceded: 28, ballsBowled: 18, catches: 1 }),
    ],
  });

  const seededTeams = await prisma.fantasyTeam.findMany({
    where: { seasonId: season.id },
    orderBy: { totalPoints: "desc" },
    include: { user: { select: { email: true } } },
  });

  console.log("Seed complete.");
  console.log(`Season: ${season.name}`);
  console.log(`Demo password for all demo users: ${DEMO_PASSWORD}`);
  console.table(
    seededTeams.map((team) => ({
      email: team.user.email,
      team: team.name,
      totalPoints: team.totalPoints,
    })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
