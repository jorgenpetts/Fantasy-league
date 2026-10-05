import type { Page } from "@playwright/test";
import type {
  Player,
  PlayerPerformance,
  Round,
  Season,
  FantasyLineup,
  FantasyRules,
  UserRole,
} from "../../types/api";

export async function fantasyApi(
  page: Page,
  options: {
    role?: UserRole | null;
    edge?: boolean;
    empty?: boolean;
    failure?: boolean;
    loading?: boolean;
    privateTeam?: boolean;
    noHistory?: boolean;
    noTeam?: boolean;
    usedChips?: boolean;
  } = {},
) {
  const long = options.edge
    ? "AlexandertheUnbrokenLongNamePettenburgerPerwald"
    : "Alex";
  const name = options.edge
    ? "The Extraordinary East Coast Cricket Championship Contenders"
    : "Coastal XI";
  const season: Season = {
    id: "s1",
    name: "2026/27 Fantasy Cricket",
    startDate: "2026-09-01T00:00:00Z",
    endDate: "2027-04-01T00:00:00Z",
    active: true,
  };
  const round = (id: string, num: number, status: Round["status"]): Round => ({
    id,
    seasonId: "s1",
    roundNumber: num,
    name: `Club cricket round ${num}`,
    deadline:
      status === "UPCOMING" ? "2035-10-01T08:00:00Z" : "2020-09-20T08:00:00Z",
    status,
    canEdit: status === "UPCOMING",
    isLocked: status !== "UPCOMING",
    season,
  });
  const rounds = [
    round("r0", 10, "COMPLETED"),
    round("r1", 11, "LOCKED"),
    round("r2", 12, "UPCOMING"),
  ];
  const positions: Player["position"][] = [
    "WICKET_KEEPER",
    "BATTER",
    "BATTER",
    "BATTER",
    "BATTER",
    "ALL_ROUNDER",
    "ALL_ROUNDER",
    "BOWLER",
    "BOWLER",
    "BOWLER",
    "BOWLER",
    "BATTER",
  ];
  const players: Player[] = positions.map((position, index) => ({
    id: `p${index + 1}`,
    firstName: index === 0 ? long : `Player${index + 1}`,
    lastName: index === 0 ? "Keeper" : "Cricketer",
    position,
    price: 9000000,
    active: true,
    totalFantasyPoints: 777,
  }));
  const stats = {
    didBat: true,
    notOut: false,
    runs: 20,
    ballsFaced: 30,
    wickets: 2,
    runsConceded: 20,
    ballsBowled: 24,
    maidens: 0,
    catches: 1,
    droppedCatches: 0,
    stumpings: 0,
    runOuts: 0,
  };
  const performance: PlayerPerformance = {
    ...stats,
    id: "perf1",
    playerId: "p1",
    roundId: "r1",
    round: rounds[1],
    player: players[0],
    fantasyPoints: 777,
  };
  const transfers = {
    transfersMade: 5,
    freeTransfers: 3,
    extraTransfers: 2,
    transferPenalty: 8,
    playersIn: ["p12"],
    playersOut: ["p2"],
    wildcardActive: false,
  };
  const lineup: FantasyLineup = {
    id: "l0",
    fantasyTeam: { id: "t1", name, managerName: long },
    round: rounds[0],
    captainId: "p1",
    players: players.slice(0, 11),
    squadValue: 99000000,
    grossPoints: 432,
    roundPoints: 424,
    transfers,
    activeChip: null,
    createdAt: "2026-09-01T00:00:00Z",
  };
  const rules: FantasyRules = {
    squad: {
      size: 11,
      budget: 110000000,
      positions: { WICKET_KEEPER: 1, BATTER: 4, ALL_ROUNDER: 2, BOWLER: 4 },
    },
    transfers: { freePerRound: 3, extraTransferPenalty: 4 },
    chips: { perSeason: { WILDCARD: 1, TRIPLE_CAPTAIN: 1 } },
    scoring: {
      pointsPerRun: 1,
      notOutBonus: 10,
      fiftyBonus: 20,
      centuryBonus: 40,
      duckPenalty: 20,
      pointsPerWicket: 20,
      pointsPerMaiden: 3,
      threeWicketBonus: 20,
      fiveWicketBonus: 40,
      expensiveBowlingRunsThreshold: 50,
      expensiveBowlingPenalty: 20,
      catch: 10,
      droppedCatch: -10,
      stumping: 15,
      runOut: 15,
      captainMultiplier: 2,
      tripleCaptainMultiplier: 3,
    },
  };
  const state = {
    role:
      options.role === undefined ? ("ADMIN" as UserRole | null) : options.role,
    seasons: options.empty
      ? ([] as Season[])
      : [
          season,
          { ...season, id: "s2", name: "Previous Season", active: false },
        ],
    rounds: options.empty ? ([] as Round[]) : rounds,
    players: options.empty ? ([] as Player[]) : players,
    performances: options.empty ? ([] as PlayerPerformance[]) : [performance],
    reads: [] as string[],
    writes: [] as { path: string; body: Record<string, unknown> }[],
    nextError: null as { status: number; body: unknown } | null,
    score: options.edge ? 123456 : 777,
    currentLineup: { ...lineup, id: "l2", round: rounds[2] },
    chip: null as "WILDCARD" | "TRIPLE_CAPTAIN" | null,
    noTeam: Boolean(options.noTeam),
  };
  const chips = () => ({
    active: state.chip,
    wildcard: {
      available: !options.usedChips && state.chip !== "WILDCARD",
      usedRoundId: options.usedChips ? "r0" : null,
    },
    tripleCaptain: {
      available: !options.usedChips && state.chip !== "TRIPLE_CAPTAIN",
      usedRoundId: options.usedChips ? "r0" : null,
    },
  });
  const team = (id: string) => ({
    id,
    name: id === "t1" ? name : `${name} Rivals`,
    managerName: long,
    season,
    createdAt: lineup.createdAt,
    updatedAt: lineup.createdAt,
  });
  const history = (id: string) => [
    {
      ...lineup,
      roundPoints: state.score,
      fantasyTeam: { id, name: team(id).name, managerName: long },
    },
    options.privateTeam
      ? {
          team: { id, name: team(id).name, managerName: long },
          round: rounds[2],
          lineupLockedForViewing: true,
        }
      : {
          ...lineup,
          id: "l1",
          round: rounds[1],
          roundPoints: state.score,
          fantasyTeam: { id, name: team(id).name, managerName: long },
        },
  ];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api/, "");
    const send = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/auth/me")
      return state.role
        ? send({
            user: {
              id: "u",
              name: long,
              email: "test@example.com",
              role: state.role,
            },
          })
        : send({ message: "Unauthenticated" }, 401);
    if (path === "/auth/login" || path === "/auth/register") {
      state.role = "ADMIN";
      return send({
        user: { id: "u", name: long, email: "test@example.com", role: "ADMIN" },
      });
    }
    if (path === "/auth/logout") {
      state.role = null;
      return send({ message: "Logged out" });
    }
    if (path.startsWith("/admin/") && state.role !== "ADMIN")
      return send({ message: "Forbidden" }, 403);
    if (request.method() === "GET") {
      state.reads.push(path + url.search);
      if (options.loading)
        await new Promise((resolve) => setTimeout(resolve, 15000));
      if (options.failure)
        return send({ message: "Internal server error" }, 500);
      if (path === "/players")
        return send({
          players: state.players.filter(
            (p) =>
              (!url.searchParams.has("active") ||
                p.active === (url.searchParams.get("active") === "true")) &&
              (!url.searchParams.has("position") ||
                p.position === url.searchParams.get("position")) &&
              `${p.firstName} ${p.lastName}`
                .toLowerCase()
                .includes((url.searchParams.get("search") ?? "").toLowerCase()),
          ),
        });
      if (/^\/players\/[^/]+$/.test(path))
        return send({
          player: state.players.find((p) => p.id === path.split("/")[2]),
        });
      if (path === "/seasons") return send({ seasons: state.seasons });
      if (path === "/seasons/current")
        return state.seasons.length
          ? send({ season: state.seasons.find((s) => s.active) })
          : send({}, 404);
      if (path === "/rounds")
        return send({
          rounds: state.rounds.filter(
            (r) =>
              !url.searchParams.has("seasonId") ||
              r.seasonId === url.searchParams.get("seasonId"),
          ),
        });
      if (/^\/rounds\/[^/]+$/.test(path)) {
        const found = state.rounds.find((r) => r.id === path.split("/")[2]);
        return found
          ? send({ round: found })
          : send({ message: "Round not found" }, 404);
      }
      if (path.endsWith("/performances")) {
        const isPlayer = path.startsWith("/players/");
        const id = path.split("/").at(-2);
        return send({
          performances: isPlayer
            ? state.performances.filter((p) => p.playerId === id)
            : state.performances.filter((p) => p.roundId === id),
        });
      }
      if (path === "/fantasy-rules") return send({ fantasyRules: rules });
      if (path === "/fantasy-teams/me/status")
        return send({
          fantasyTeam:
            state.noTeam || options.empty ? null : { id: "t1", name },
          round: rounds[2],
          squad: {
            value: 99000000,
            budget: 110000000,
            remainingBudget: 11000000,
          },
          transfers,
          chips: chips(),
        });
      if (path === "/fantasy-teams/me")
        return state.noTeam || options.empty
          ? send({}, 404)
          : send({ fantasyTeam: team("t1") });
      if (path === "/lineups/me/current")
        return send({
          fantasyTeam: { id: "t1", name },
          round: rounds[2],
          lineup: state.currentLineup,
          suggestedLineup: null,
          previousLineup: lineup,
        });
      if (path.startsWith("/lineups/"))
        return send({
          lineup: {
            ...lineup,
            round:
              rounds.find((r) => r.id === path.split("/").at(-1)) ?? rounds[0],
            roundPoints: state.score,
          },
        });
      if (path.endsWith("/lineups"))
        return send({
          lineups:
            options.empty || options.noHistory
              ? []
              : history(path.split("/")[2]),
        });
      if (path.startsWith("/fantasy-teams/"))
        return send({
          fantasyTeam: {
            ...team(path.split("/")[2]),
            lineups:
              options.empty || options.noHistory
                ? []
                : history(path.split("/")[2]),
          },
        });
      const entries = options.empty
        ? []
        : [
            {
              rank: 123,
              fantasyTeamId: "t1",
              fantasyTeamName: name,
              managerName: long,
              roundPoints: state.score,
              totalPoints: state.score,
            },
            {
              rank: 124,
              fantasyTeamId: "t2",
              fantasyTeamName: `${name} Rivals`,
              managerName: long,
              roundPoints: 100,
              totalPoints: 100,
            },
          ];
      if (path === "/leaderboard")
        return send({
          leaderboard: {
            seasonId: "s1",
            roundId: url.searchParams.get("roundId"),
            rankingStyle: "competition",
            entries,
          },
        });
      if (path === "/dashboard")
        return send({
          dashboard: {
            season: options.empty ? null : season,
            currentRound: rounds[1],
            fantasyTeam: state.noTeam ? null : { id: "t1", name },
            lineup: state.noTeam ? null : lineup,
            roundPoints: state.score,
            totalPoints: state.score,
            overallRank: 123,
            squad: {
              value: 99000000,
              budget: 110000000,
              remainingBudget: 11000000,
            },
            transfers,
            chips: chips(),
            topPerformers: [
              {
                playerId: "p1",
                firstName: players[0].firstName,
                lastName: players[0].lastName,
                position: "WICKET_KEEPER",
                fantasyPoints: state.score,
              },
            ],
            leaderboardPreview: entries,
          },
        });
      return send({}, 404);
    }
    const body = (request.postData() ? request.postDataJSON() : {}) as Record<
      string,
      unknown
    >;
    state.writes.push({ path, body });
    if (state.nextError) {
      const err = state.nextError;
      state.nextError = null;
      return send(err.body, err.status);
    }
    if (path.endsWith("/performances")) {
      const roundId = path.split("/").at(-2)!;
      for (const raw of body.performances as Array<Record<string, unknown>>) {
        const playerId = String(raw.playerId);
        const existing = state.performances.find(
          (p) => p.playerId === playerId && p.roundId === roundId,
        );
        const updated = {
          ...raw,
          id: existing?.id ?? `perf-${playerId}`,
          roundId,
          round: state.rounds.find((r) => r.id === roundId)!,
          player: players.find((p) => p.id === playerId),
          fantasyPoints: 432,
        } as PlayerPerformance;
        if (existing) Object.assign(existing, updated);
        else state.performances.push(updated);
      }
      state.score = 432;
      return send({
        roundId,
        performancesProcessed: state.performances.filter(
          (p) => p.roundId === roundId,
        ).length,
        lineupsProcessed: 2,
        fantasyTeamsUpdated: 2,
      });
    }
    if (path.endsWith("/recalculate"))
      return send({
        roundId: path.split("/").at(-2),
        performancesProcessed: state.performances.length,
        lineupsProcessed: 2,
        fantasyTeamsUpdated: 2,
      });
    if (path.startsWith("/admin/rounds/")) {
      const target = state.rounds.find((r) => r.id === path.split("/").at(-1));
      Object.assign(target!, body, { canEdit: false, isLocked: true });
      return send({ round: target });
    }
    if (path.endsWith("/chip")) {
      state.chip =
        request.method() === "DELETE"
          ? null
          : (body.chipType as typeof state.chip);
      return send({ chipUsage: { id: "chip", chipType: state.chip } });
    }
    if (path.startsWith("/lineups/")) {
      Object.assign(state.currentLineup, {
        captainId: body.captainId,
        players: players.filter((p) =>
          (body.playerIds as string[]).includes(p.id),
        ),
      });
      return send({ lineup: state.currentLineup });
    }
    if (path === "/fantasy-teams") {
      state.noTeam = false;
      return send({ fantasyTeam: team("t1") }, 201);
    }
    return send({}, 404);
  });
  return state;
}
