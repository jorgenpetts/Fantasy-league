import type { Player, PlayerPerformance } from "../../../types/api.ts";

export const statFields = [
  { key: "runs", label: "Runs", group: "Batting" },
  { key: "ballsFaced", label: "Balls faced", group: "Batting" },
  { key: "wickets", label: "Wickets", group: "Bowling" },
  { key: "runsConceded", label: "Runs conceded", group: "Bowling" },
  { key: "ballsBowled", label: "Balls bowled", group: "Bowling" },
  { key: "maidens", label: "Maidens", group: "Bowling" },
  { key: "catches", label: "Catches", group: "Fielding" },
  { key: "droppedCatches", label: "Dropped catches", group: "Fielding" },
  { key: "stumpings", label: "Stumpings", group: "Fielding" },
  { key: "runOuts", label: "Run outs", group: "Fielding" },
] as const;

export type StatKey = (typeof statFields)[number]["key"];
export type PerformanceInput = { playerId: string; didBat: boolean; notOut: boolean } & Record<
  StatKey,
  number
>;
export type PerformanceDraft = { didBat: boolean; notOut: boolean } & Record<StatKey, string>;
export type Drafts = Record<string, PerformanceDraft>;
export type RowErrors = Record<
  string,
  Partial<Record<StatKey | "didBat" | "notOut" | "row", string>>
>;
export type ScoringSummary = {
  roundId: string;
  performancesProcessed: number;
  lineupsProcessed: number;
  fantasyTeamsUpdated: number;
};

export function draftFromPerformance(
  performance?: PlayerPerformance,
): PerformanceDraft {
  return {
    didBat: performance?.didBat ?? false,
    notOut: performance?.notOut ?? false,
    ...Object.fromEntries(
      statFields.map(({ key }) => [key, String(performance?.[key] ?? 0)]),
    ),
  } as PerformanceDraft;
}

export function matchesSaved(
  draft: PerformanceDraft,
  saved?: PlayerPerformance,
) {
  return Boolean(
    saved &&
    draft.didBat === saved.didBat &&
    draft.notOut === saved.notOut &&
    statFields.every(
      ({ key }) =>
        /^\d+$/.test(draft[key].trim()) && Number(draft[key]) === saved[key],
    ),
  );
}

export function prepareBulkSave(drafts: Drafts) {
  const errors: RowErrors = {};
  const performances: PerformanceInput[] = [];
  for (const [playerId, draft] of Object.entries(drafts)) {
    const row: PerformanceInput = {
      playerId,
      didBat: draft.didBat,
      notOut: draft.notOut,
    } as PerformanceInput;
    for (const { key, label } of statFields) {
      const value = draft[key].trim();
      const number = Number(value);
      if (
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(number) ||
        number > 2_147_483_647
      ) {
        errors[playerId] ??= {};
        errors[playerId][key] =
          `${label} must be a whole number from 0 to 2,147,483,647.`;
      } else row[key] = number;
    }
    performances.push(row);
  }
  return { performances, errors };
}

export function performancePlayers(
  players: Player[],
  performances: PlayerPerformance[],
) {
  const unique = new Map(players.map((player) => [player.id, player]));
  for (const performance of performances) {
    if (!unique.has(performance.playerId) && performance.player)
      unique.set(performance.playerId, performance.player);
  }
  const order = ["WICKET_KEEPER", "BATTER", "ALL_ROUNDER", "BOWLER"];
  return [...unique.values()].sort(
    (a, b) =>
      order.indexOf(a.position) - order.indexOf(b.position) ||
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName) ||
      a.id.localeCompare(b.id),
  );
}

export function performanceProgress(
  players: Player[],
  performances: PlayerPerformance[],
) {
  const entered = new Set(
    performances.map((performance) => performance.playerId),
  );
  const count = players.filter((player) => entered.has(player.id)).length;
  return {
    entered: count,
    total: players.length,
    outstanding: players.length - count,
  };
}

export const scoringInvalidationPrefixes = [
  "admin",
  "players",
  "player",
  "round",
  "seasons",
  "dashboard",
  "leaderboard",
  "fantasy-team",
  "lineups",
] as const;
