import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ChipBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import {
  formatPlayerPrice,
  getPlayerPositionLabel,
  playerPositionLabels,
} from "@/lib/format";
import type { DashboardSummary } from "@/types/api";
import {
  getActiveChip,
  getPlayerName,
  positionOrder,
} from "./dashboard-utils";

function groupPlayers(lineup: NonNullable<DashboardSummary["lineup"]>) {
  return positionOrder.map((position) => ({
    position,
    players: lineup.players.filter((player) => player.position === position),
  }));
}

function actionLabel(canEdit?: boolean) {
  return canEdit ? "Manage Team" : "View Team";
}

export function SquadPreview({
  dashboard,
}: {
  dashboard: DashboardSummary;
}) {
  const { fantasyTeam, lineup, currentRound, chips } = dashboard;

  if (!fantasyTeam) {
    return (
      <EmptyState
        title="Create your fantasy team"
        description="Build your 11-player squad to join the competition."
        action={
          <Button asChild>
            <Link href="/team">Create Team</Link>
          </Button>
        }
      />
    );
  }

  if (!lineup) {
    return (
      <EmptyState
        title="Your squad is not complete yet"
        description={
          currentRound
            ? `Select 11 players before ${currentRound.name}.`
            : "Your next squad will appear here once a round is available."
        }
        action={
          <Button asChild>
            <Link href="/team">Build Squad</Link>
          </Button>
        }
      />
    );
  }

  const activeChip = getActiveChip(lineup, chips);

  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Current Squad
            </p>
            <h2 className="mt-1 text-xl font-bold">{fantasyTeam.name}</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/team">
              <ArrowRight aria-hidden="true" />
              {actionLabel(currentRound?.canEdit)}
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {groupPlayers(lineup).map(({ position, players }) => (
            <section
              key={position}
              aria-labelledby={`dashboard-${position}`}
              className="rounded-card border border-border bg-surface-muted p-3"
            >
              <h3
                id={`dashboard-${position}`}
                className="text-sm font-bold text-foreground"
              >
                {playerPositionLabels[position]}
              </h3>
              <div className="mt-3 space-y-2">
                {players.map((player) => {
                  const isCaptain = player.id === lineup.captainId;

                  return (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      className="block rounded-md border border-border bg-surface p-3 transition-colors hover:border-primary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {getPlayerName(player)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {getPlayerPositionLabel(player.position)} -{" "}
                            {formatPlayerPrice(player.price)}
                          </p>
                        </div>
                        {isCaptain ? (
                          <Crown
                            className="size-4 shrink-0 text-warning"
                            aria-label="Captain"
                          />
                        ) : null}
                      </div>
                      {isCaptain ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone="warning">Captain</Badge>
                          {activeChip === "TRIPLE_CAPTAIN" ? (
                            <ChipBadge chipType="TRIPLE_CAPTAIN" />
                          ) : null}
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
