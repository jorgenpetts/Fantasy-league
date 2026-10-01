"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoundStatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/state";
import { ApiError } from "@/lib/api";
import { formatDeadline } from "@/lib/format";
import { formatSeasonDate } from "@/lib/date-time";
import {
  useCurrentSeason,
  useSeasonRounds,
} from "@/features/fantasy-team/hooks";
import { useLeaderboard } from "@/features/leaderboard/hooks";
import { useAdminPerformances, useAdminPlayers } from "../hooks";
import { getOverviewRound } from "../utils";

export function AdminSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0 space-y-3 p-5">
      <h2 className="font-bold">{title}</h2>
      {children}
    </Card>
  );
}

function Action({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="outline">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function SummaryLoading() {
  return (
    <div
      role="status"
      aria-label="Loading admin dashboard"
      className="grid gap-4 sm:grid-cols-2"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="space-y-4 p-5">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-full" />
        </Card>
      ))}
    </div>
  );
}

const areas = [
  {
    title: "Players",
    description: "Manage player names, positions, prices and active status.",
    href: "/admin/players",
    action: "Manage Players",
  },
  {
    title: "Seasons",
    description: "Organise the competition and active season.",
    href: "/admin/seasons",
    action: "Manage Seasons",
  },
  {
    title: "Rounds",
    description: "Manage round deadlines and round status.",
    href: "/admin/rounds",
    action: "Manage Rounds",
  },
  {
    title: "Performances",
    description: "Manage cricket statistics and fantasy results.",
    href: "/admin/performances",
    action: "Manage Performances",
  },
];

export function AdminOverview() {
  const seasonQuery = useCurrentSeason(true);
  const season = seasonQuery.data?.season;
  const roundsQuery = useSeasonRounds(season?.id);
  const playersQuery = useAdminPlayers();
  const teamsQuery = useLeaderboard({ seasonId: season?.id });
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const rounds = roundsQuery.data?.rounds ?? [];
  const round =
    rounds.find((item) => item.id === selectedRoundId) ??
    getOverviewRound(rounds);
  const performancesQuery = useAdminPerformances(round?.id);
  const noSeason =
    seasonQuery.error instanceof ApiError && seasonQuery.error.status === 404;


  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin"
        title="Admin Dashboard"
        description="Manage the fantasy competition, players and round results."
      />
      <div className="space-y-5">
        {seasonQuery.isLoading ? (
          <SummaryLoading />
        ) : seasonQuery.isError && !noSeason ? (
          <div role="alert">
            <ErrorState
              title="Unable to load admin dashboard."
              description="Please try again in a moment."
              onRetry={() => void seasonQuery.refetch()}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {season ? (
                <AdminSection title="Active Season">
                  <p className="text-lg font-semibold">{season.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatSeasonDate(season.startDate)} – {formatSeasonDate(season.endDate)}
                  </p>
                  <Action href="/admin/seasons">Manage Seasons</Action>
                </AdminSection>
              ) : (
                <EmptyState
                  title="No active season"
                  description="Create or activate a season to begin managing rounds."
                  action={<Action href="/admin/seasons">Manage Seasons</Action>}
                />
              )}
              {season ? (
                roundsQuery.isLoading ? (
                  <div role="status" aria-label="Loading rounds">
                    <Skeleton className="h-52 w-full" />
                  </div>
                ) : roundsQuery.isError ? (
                  <div role="alert">
                    <ErrorState
                      title="Unable to load rounds"
                      onRetry={() => void roundsQuery.refetch()}
                    />
                  </div>
                ) : round ? (
                  <AdminSection title="Round overview">
                    <label
                      htmlFor="admin-round"
                      className="block text-sm font-medium"
                    >
                      Review round
                    </label>
                    <select
                      id="admin-round"
                      value={round.id}
                      onChange={(event) =>
                        setSelectedRoundId(event.target.value)
                      }
                      className="min-h-11 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-sm"
                    >
                      {rounds.map((item) => (
                        <option key={item.id} value={item.id}>
                          Round {item.roundNumber} · {item.name}
                        </option>
                      ))}
                    </select>
                    <p className="font-semibold">
                      Round {round.roundNumber} · {round.name}
                    </p>
                    <RoundStatusBadge status={round.status} />
                    <p className="text-sm">
                      Deadline: {formatDeadline(round.deadline)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {round.status === "COMPLETED"
                        ? "Round completed. Manage the next round or review results."
                        : round.canEdit
                          ? "Team editing open."
                          : "Team editing closed. Review performances and results."}
                    </p>
                    <Action href="/admin/rounds">Manage Rounds</Action>
                  </AdminSection>
                ) : (
                  <EmptyState
                    title="No current round"
                    description="No current round has been scheduled."
                    action={<Action href="/admin/rounds">Manage Rounds</Action>}
                  />
                )
              ) : null}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <AdminSection title="Players">
                {playersQuery.isLoading ? (
                  <div role="status" aria-label="Loading player summary">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : playersQuery.isError ? (
                  <div role="alert">
                    <ErrorState
                      title="Player summary unavailable"
                      onRetry={() => void playersQuery.refetch()}
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">
                      {playersQuery.data?.players.length ?? 0} total
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {playersQuery.data?.players.filter(
                        (player) => player.active,
                      ).length ?? 0}{" "}
                      active ·{" "}
                      {playersQuery.data?.players.filter(
                        (player) => !player.active,
                      ).length ?? 0}{" "}
                      inactive
                    </p>
                  </>
                )}
              </AdminSection>
              <AdminSection title="Fantasy Teams">
                {!season ? (
                  <p className="text-sm text-muted-foreground">
                    Available once a season is active.
                  </p>
                ) : teamsQuery.isLoading ? (
                  <div role="status" aria-label="Loading team count">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : teamsQuery.isError ? (
                  <div role="alert">
                    <ErrorState
                      title="Fantasy-team count unavailable"
                      onRetry={() => void teamsQuery.refetch()}
                    />
                  </div>
                ) : (
                  <p className="text-2xl font-bold">
                    {teamsQuery.data?.leaderboard.entries.length ?? 0} competing
                  </p>
                )}
              </AdminSection>
              <AdminSection title="Player Performances">
                {!round || roundsQuery.isError ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a scheduled round to review performances.
                  </p>
                ) : performancesQuery.isLoading ? (
                  <div role="status" aria-label="Loading performance summary">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : performancesQuery.isError ? (
                  <div role="alert">
                    <ErrorState
                      title="Performance summary unavailable"
                      onRetry={() => void performancesQuery.refetch()}
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold">
                      {performancesQuery.data?.performances.length ?? 0}{" "}
                      recorded
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Round {round.roundNumber}. Review the round’s performances
                      to check for missing entries.
                    </p>
                  </>
                )}
                <Action href={round ? `/admin/performances?${new URLSearchParams({ seasonId: round.seasonId, roundId: round.id })}` : "/admin/performances"}>Manage Performances</Action>
              </AdminSection>
            </div>
          </>
        )}
        <section>
          <SectionHeader title="Quick Actions" />
          <div className="flex flex-wrap gap-2">
            <Action href="/admin/players">Manage Players</Action>
            <Action href="/admin/rounds">Manage Rounds</Action>
            <Action href="/admin/performances">
              {round?.status === "LOCKED"
                ? "Enter Performances"
                : "Review Performances"}
            </Action>
            {round?.status === "LOCKED" || round?.status === "COMPLETED" ? (
              <Action href="/leaderboard">Review Results</Action>
            ) : null}
          </div>
        </section>
        <section>
          <SectionHeader
            title="Management Areas"
            description="Manage players, seasons, rounds and performance results."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {areas.map((area) => (
              <AdminSection key={area.href} title={area.title}>
                <p className="text-sm leading-6 text-muted-foreground">
                  {area.description}
                </p>
                <Action href={area.href}>{area.action}</Action>
              </AdminSection>
            ))}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
