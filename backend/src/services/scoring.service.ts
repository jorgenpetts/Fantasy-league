export type PlayerPerformanceStats = {
  runs: number;
  ballsFaced: number;
  wickets: number;
  runsConceded: number;
  oversBowled: number;
  catches: number;
  stumpings: number;
  runOuts: number;
};

export function calculatePlayerFantasyPoints(
  _performance: PlayerPerformanceStats,
): number {
  throw new Error("Fantasy scoring rules have not been finalised yet.");
}
