import type {
  FantasyLineup,
  HiddenLineup,
  PlayerPerformance,
  PlayerPosition,
} from "@/types/api";

const HISTORY_POSITION_ORDER: PlayerPosition[] = [
  "WICKET_KEEPER",
  "BATTER",
  "ALL_ROUNDER",
  "BOWLER",
];

export function isFantasyLineup(
  lineup: FantasyLineup | HiddenLineup,
): lineup is FantasyLineup {
  return !("lineupLockedForViewing" in lineup);
}

export function getHistoricalLineups(
  lineups: Array<FantasyLineup | HiddenLineup>,
) {
  return lineups
    .filter(isFantasyLineup)
    .filter((lineup) => !lineup.round.canEdit)
    .sort((left, right) => right.round.roundNumber - left.round.roundNumber);
}

export function groupLineupPlayers(lineup: FantasyLineup) {
  return HISTORY_POSITION_ORDER.map((position) => ({
    position,
    players: lineup.players.filter((player) => player.position === position),
  })) satisfies Array<{
    position: PlayerPosition;
    players: FantasyLineup["players"];
  }>;
}

export function getPerformancePointsByPlayer(
  performances: PlayerPerformance[],
) {
  return new Map(
    performances.map((performance) => [
      performance.playerId,
      performance.fantasyPoints,
    ]),
  );
}

export function getLineupPlayerNameMap(lineups: FantasyLineup[]) {
  return new Map(
    lineups.flatMap((lineup) =>
      lineup.players.map((player) => [
        player.id,
        `${player.firstName} ${player.lastName}`,
      ] as const),
    ),
  );
}

export type TeamRoundView = {
  round: FantasyLineup["round"];
  lineup: FantasyLineup | HiddenLineup | null;
};

export function getTeamRoundViews(
  rounds: Array<FantasyLineup["round"]>,
  lineups: Array<FantasyLineup | HiddenLineup>,
): TeamRoundView[] {
  const lineupByRound = new Map(
    lineups.map((lineup) => [lineup.round.id, lineup]),
  );
  const views = rounds
    .filter((round) => !round.canEdit || lineupByRound.has(round.id))
    .map((round) => ({
      round,
      lineup: lineupByRound.get(round.id) ?? null,
    }));
  const knownRoundIds = new Set(rounds.map((round) => round.id));

  for (const lineup of lineups) {
    if (!knownRoundIds.has(lineup.round.id)) {
      views.push({ round: lineup.round, lineup });
    }
  }

  return views.sort(
    (left, right) => right.round.roundNumber - left.round.roundNumber,
  );
}
