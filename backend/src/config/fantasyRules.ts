import { ChipType, PlayerPosition } from "@prisma/client";

export const FANTASY_RULES = {
  squad: {
    size: 11,
    budget: 110_000_000,
    positions: {
      [PlayerPosition.WICKET_KEEPER]: 1,
      [PlayerPosition.BATTER]: 4,
      [PlayerPosition.ALL_ROUNDER]: 2,
      [PlayerPosition.BOWLER]: 4,
    },
  },
  transfers: {
    freePerRound: 3,
    extraTransferPenalty: 4,
  },
  chips: {
    perSeason: {
      [ChipType.WILDCARD]: 1,
      [ChipType.TRIPLE_CAPTAIN]: 1,
    },
  },
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
} as const;

export type FantasyRules = typeof FANTASY_RULES;
