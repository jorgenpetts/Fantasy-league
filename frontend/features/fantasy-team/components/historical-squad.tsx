import Link from "next/link";
import { Crown } from "lucide-react";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPoints, playerPositionLabels } from "@/lib/format";
import type { FantasyLineup, FantasyRules, PlayerPerformance } from "@/types/api";
import { getPerformancePointsByPlayer, groupLineupPlayers } from "../history-utils";
import { getPlayerName } from "../utils";

export function HistoricalSquad({
  lineup,
  performances,
  rules,
}: {
  lineup: FantasyLineup;
  performances: PlayerPerformance[];
  rules: FantasyRules;
}) {
  const pointsByPlayer = getPerformancePointsByPlayer(performances);
  const captainMultiplier =
    lineup.activeChip === "TRIPLE_CAPTAIN"
      ? rules.scoring.tripleCaptainMultiplier
      : rules.scoring.captainMultiplier;

  return (
    <Card>
      <CardContent>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase text-primary">
            Historical squad
          </p>
          <h2 className="mt-1 text-xl font-bold">Saved round selection</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This lineup is read-only and reflects the players and captain saved for this round.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {groupLineupPlayers(lineup).map(({ position, players }) => (
            <section
              key={position}
              aria-labelledby={`history-${position}`}
              className="rounded-card border border-border bg-surface-muted p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 id={`history-${position}`} className="text-sm font-bold">
                  {playerPositionLabels[position]}
                </h3>
                <PositionBadge position={position} />
              </div>
              <div className="mt-3 space-y-2">
                {players.map((player) => {
                  const points = pointsByPlayer.get(player.id) ?? 0;
                  const performanceRecorded = pointsByPlayer.has(player.id);
                  const isCaptain = player.id === lineup.captainId;

                  return (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      className="block min-h-28 rounded-md border border-border bg-surface p-3 transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {getPlayerName(player)}
                          </p>
                          <p className="mt-1 text-lg font-black">
                            {formatPoints(points)} pts
                          </p>
                        </div>
                        {isCaptain ? (
                          <Crown
                            className="size-4 shrink-0 text-warning"
                            aria-label="Captain"
                          />
                        ) : null}
                      </div>
                      {!performanceRecorded ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No performance recorded
                        </p>
                      ) : null}
                      {isCaptain ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="warning">
                            {captainMultiplier === 3
                              ? "Triple Captain x3"
                              : "Captain x2"}
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Contribution {formatPoints(points * captainMultiplier)} pts
                          </span>
                        </div>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
