"use client";

import Link from "next/link";
import { ArrowRight, Crown } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Badge, ChipBadge, RoundStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { formatPoints, formatRoundName } from "@/lib/format";
import { useFantasyTeamLineups, useFantasyTeamStatus } from "../hooks";
import { getHistoricalLineups } from "../history-utils";
import { getPlayerName } from "../utils";
import { HistoryLoading } from "./history-loading";
import { TeamHistoryNav } from "./team-history-nav";

export function RoundHistoryPage() {
  const statusQuery = useFantasyTeamStatus();
  const teamId = statusQuery.data?.fantasyTeam?.id;
  const lineupsQuery = useFantasyTeamLineups(teamId);
  const historicalLineups = getHistoricalLineups(
    lineupsQuery.data?.lineups ?? [],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="My Team"
        title="Round History"
        description="Review your saved squads, captains, chips, transfers and round scores."
      />
      <TeamHistoryNav />

      {statusQuery.isLoading || (teamId && lineupsQuery.isLoading) ? (
        <HistoryLoading />
      ) : null}

      {statusQuery.isError || lineupsQuery.isError ? (
        <ErrorState
          title="Unable to load your round history"
          description="Please try again in a moment."
          onRetry={() => {
            void statusQuery.refetch();
            void lineupsQuery.refetch();
          }}
        />
      ) : null}

      {statusQuery.isSuccess && !statusQuery.data.fantasyTeam ? (
        <EmptyState
          title="Create your fantasy team first"
          description="Your round history will appear after you create a team and save a lineup."
          action={
            <Button asChild>
              <Link href="/team">Create Team</Link>
            </Button>
          }
        />
      ) : null}

      {lineupsQuery.isSuccess && historicalLineups.length === 0 ? (
        <EmptyState
          title="No round history yet"
          description="Your completed rounds and previous squads will appear here once the competition progresses."
          action={
            <Button asChild variant="outline">
              <Link href="/team">Return to Current Team</Link>
            </Button>
          }
        />
      ) : null}

      {historicalLineups.length > 0 ? (
        <div className="grid gap-3">
          {historicalLineups.map((lineup) => {
            const captain = lineup.players.find(
              (player) => player.id === lineup.captainId,
            );

            return (
              <Link
                key={lineup.id}
                href={`/team/history/${lineup.round.id}`}
                className="group rounded-card border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr_1fr_auto] sm:items-center">
                  <div>
                    <p className="font-bold">
                      {formatRoundName(
                        lineup.round.roundNumber,
                        lineup.round.name,
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <RoundStatusBadge status={lineup.round.status} />
                      {lineup.round.status !== "COMPLETED" ? (
                        <Badge tone="warning">Results pending</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">
                      Round points
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {formatPoints(lineup.roundPoints)} pts
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">
                      Captain
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-semibold">
                      <Crown className="size-4 text-warning" aria-hidden="true" />
                      {captain ? getPlayerName(captain) : "Captain unavailable"}
                    </p>
                    <div className="mt-2">
                      {lineup.activeChip ? (
                        <ChipBadge chipType={lineup.activeChip} />
                      ) : (
                        <span className="text-xs text-muted-foreground">No chip</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </PageContainer>
  );
}
