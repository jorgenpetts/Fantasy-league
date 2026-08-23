import { FANTASY_RULES } from "./fantasyRules.js";

export type ScoringRules = typeof FANTASY_RULES.scoring;

export function getScoringRules(): ScoringRules {
  return FANTASY_RULES.scoring;
}
