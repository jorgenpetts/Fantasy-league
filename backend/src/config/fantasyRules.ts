export type FantasyRulesConfig = {
  squadSize?: number;
  startingBudget?: number;
  freeTransfersPerRound?: number;
  extraTransferPenalty?: number;
  wildcardUsesPerSeason?: number;
  positionRequirements?: {
    wicketKeepers?: number;
    batters?: number;
    allRounders?: number;
    bowlers?: number;
  };
};

export const fantasyRules: FantasyRulesConfig = {};
