import { ChipType, type FantasyLineup, type PlayerPerformance } from "@prisma/client";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import type { ScoringRules } from "../config/scoringRules.js";

export type PlayerPerformanceStats = Pick<
  PlayerPerformance,
  | "didBat"
  | "runs"
  | "ballsFaced"
  | "wickets"
  | "runsConceded"
  | "ballsBowled"
  | "catches"
  | "droppedCatches"
  | "stumpings"
  | "runOuts"
>;

export type LineupForScoring = Pick<FantasyLineup, "captainId"> & {
  players: { playerId: string }[];
};

export type CaptainMultiplierInput = {
  chipType?: ChipType | null;
};

export function calculatePlayerFantasyPoints(
  performance: PlayerPerformanceStats,
  rules: ScoringRules = FANTASY_RULES.scoring,
): number {
  const battingMilestoneBonus =
    performance.runs >= 100
      ? rules.centuryBonus
      : performance.runs >= 50
        ? rules.fiftyBonus
        : 0;

  const duckPenalty =
    performance.didBat && performance.runs === 0 ? rules.duckPenalty : 0;

  const bowlingMilestoneBonus =
    performance.wickets >= 5
      ? rules.fiveWicketBonus
      : performance.wickets >= 3
        ? rules.threeWicketBonus
        : 0;

  const expensiveBowlingPenalty =
    performance.runsConceded > rules.expensiveBowlingRunsThreshold &&
    performance.wickets === 0
      ? rules.expensiveBowlingPenalty
      : 0;

  return (
    performance.runs * rules.pointsPerRun +
    battingMilestoneBonus -
    duckPenalty +
    performance.wickets * rules.pointsPerWicket +
    bowlingMilestoneBonus -
    expensiveBowlingPenalty +
    performance.catches * rules.catch +
    performance.droppedCatches * rules.droppedCatch +
    performance.stumpings * rules.stumping +
    performance.runOuts * rules.runOut
  );
}

export function getCaptainMultiplier(
  input: CaptainMultiplierInput = {},
  rules: ScoringRules = FANTASY_RULES.scoring,
): number {
  return input.chipType === ChipType.TRIPLE_CAPTAIN
    ? rules.tripleCaptainMultiplier
    : rules.captainMultiplier;
}

export function calculateLineupGrossPoints(
  lineup: LineupForScoring,
  playerPerformances: Pick<PlayerPerformance, "playerId" | "fantasyPoints">[],
  captainMultiplier = getCaptainMultiplier(),
): number {
  const pointsByPlayerId = new Map(
    playerPerformances.map((performance) => [
      performance.playerId,
      performance.fantasyPoints,
    ]),
  );

  return lineup.players.reduce((total, selectedPlayer) => {
    const playerId = selectedPlayer.playerId;
    const basePoints = pointsByPlayerId.get(playerId) ?? 0;
    const multiplier = playerId === lineup.captainId ? captainMultiplier : 1;

    return total + basePoints * multiplier;
  }, 0);
}

export const calculateLineupRoundPoints = calculateLineupGrossPoints;
