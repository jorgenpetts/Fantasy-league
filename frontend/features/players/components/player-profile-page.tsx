"use client";

import Link from "next/link";
import { ArrowLeft, ShieldOff, Trophy } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/state";
import { ApiError } from "@/lib/api";
import { formatPlayerPrice, formatPoints, formatRoundName } from "@/lib/format";
import type { PlayerPerformance } from "@/types/api";
import { usePlayer, usePlayerPerformances } from "../hooks";

function getPlayerName(player: { firstName: string; lastName: string }) {
  return `${player.firstName} ${player.lastName}`;
}

function sortPerformances(performances: PlayerPerformance[]) {
  return [...performances].sort((a, b) => {
    const roundDiff = b.round.roundNumber - a.round.roundNumber;

    if (roundDiff !== 0) {
      return roundDiff;
    }

    return new Date(b.round.deadline).getTime() - new Date(a.round.deadline).getTime();
  });
}

function getSummary(performances: PlayerPerformance[]) {
  return performances.reduce(
    (summary, performance) => ({
      runs: summary.runs + performance.runs,
      wickets: summary.wickets + performance.wickets,
      catches: summary.catches + performance.catches,
      droppedCatches: summary.droppedCatches + performance.droppedCatches,
      stumpings: summary.stumpings + performance.stumpings,
      runOuts: summary.runOuts + performance.runOuts,
    }),
    {
      runs: 0,
      wickets: 0,
      catches: 0,
      droppedCatches: 0,
      stumpings: 0,
      runOuts: 0,
    },
  );
}

function ProfileLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-10 w-40" />
      <Card className="mt-6">
        <CardContent>
          <Skeleton className="h-8 w-60" />
          <Skeleton className="mt-4 h-20 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="mt-5 h-80 w-full" />
    </PageContainer>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface-muted p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function PerformanceMobileCard({
  performance,
}: {
  performance: PlayerPerformance;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-muted p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">
            {formatRoundName(performance.round.roundNumber, performance.round.name)}
          </p>
          <p className="text-xs text-muted-foreground">
            {performance.round.season?.name}
          </p>
        </div>
        <span className="text-lg font-black">
          {formatPoints(performance.fantasyPoints)} pts
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Runs</dt>
          <dd className="font-bold">{performance.runs}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Wickets</dt>
          <dd className="font-bold">{performance.wickets}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Catches</dt>
          <dd className="font-bold">{performance.catches}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Drops</dt>
          <dd className="font-bold">{performance.droppedCatches}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Stumpings</dt>
          <dd className="font-bold">{performance.stumpings}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Run-outs</dt>
          <dd className="font-bold">{performance.runOuts}</dd>
        </div>
      </dl>
    </div>
  );
}

function PerformanceHistory({
  performances,
}: {
  performances: PlayerPerformance[];
}) {
  if (performances.length === 0) {
    return (
      <EmptyState
        title="No performances recorded"
        description="No round performances have been recorded for this player yet."
      />
    );
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-bold">Performance History</h2>

        <div className="mt-4 space-y-3 md:hidden">
          {performances.map((performance) => (
            <PerformanceMobileCard
              key={performance.id}
              performance={performance}
            />
          ))}
        </div>

        <div className="mt-4 hidden overflow-hidden rounded-card border border-border md:block">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Round</th>
                <th className="px-4 py-3 text-right">Runs</th>
                <th className="px-4 py-3 text-right">Wkts</th>
                <th className="px-4 py-3 text-right">Catches</th>
                <th className="px-4 py-3 text-right">Drops</th>
                <th className="px-4 py-3 text-right">Stumpings</th>
                <th className="px-4 py-3 text-right">Run-outs</th>
                <th className="px-4 py-3 text-right">Fantasy Pts</th>
              </tr>
            </thead>
            <tbody>
              {performances.map((performance) => (
                <tr key={performance.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">
                    {formatRoundName(
                      performance.round.roundNumber,
                      performance.round.name,
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{performance.runs}</td>
                  <td className="px-4 py-3 text-right">{performance.wickets}</td>
                  <td className="px-4 py-3 text-right">{performance.catches}</td>
                  <td className="px-4 py-3 text-right">
                    {performance.droppedCatches}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {performance.stumpings}
                  </td>
                  <td className="px-4 py-3 text-right">{performance.runOuts}</td>
                  <td className="px-4 py-3 text-right font-black">
                    {formatPoints(performance.fantasyPoints)} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayerProfilePage({ playerId }: { playerId: string }) {
  const playerQuery = usePlayer(playerId);
  const performancesQuery = usePlayerPerformances(playerId);
  const notFound =
    playerQuery.error instanceof ApiError && playerQuery.error.status === 404;

  if (playerQuery.isLoading) {
    return <ProfileLoading />;
  }

  if (notFound) {
    return (
      <PageContainer>
        <EmptyState
          title="Player not found"
          description="This player may have been removed or the link may be incorrect."
          action={
            <Button asChild variant="outline">
              <Link href="/players">Back to Players</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (playerQuery.isError || !playerQuery.data?.player) {
    return (
      <PageContainer>
        <ErrorState
          title="Unable to load player"
          description="Please try again in a moment."
          onRetry={() => void playerQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const player = playerQuery.data.player;
  const performances = sortPerformances(
    performancesQuery.data?.performances ?? [],
  );
  const summary = getSummary(performances);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Player Profile"
        title={getPlayerName(player)}
        description="Performance history and backend-calculated fantasy points."
        actions={
          <Button asChild variant="outline">
            <Link href="/players">
              <ArrowLeft aria-hidden="true" />
              Back to Players
            </Link>
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PositionBadge position={player.position} />
                {player.active ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="warning">
                    <ShieldOff className="mr-1 size-3" aria-hidden="true" />
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="mt-5 text-4xl font-black">
                {formatPoints(player.totalFantasyPoints ?? 0)} pts
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Total fantasy points
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-80">
              <StatCard label="Price" value={formatPlayerPrice(player.price)} />
              <StatCard
                label="Performances"
                value={formatPoints(performances.length)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Runs" value={formatPoints(summary.runs)} />
        <StatCard label="Wickets" value={formatPoints(summary.wickets)} />
        <StatCard label="Catches" value={formatPoints(summary.catches)} />
        <StatCard label="Drops" value={formatPoints(summary.droppedCatches)} />
        <StatCard label="Stumpings" value={formatPoints(summary.stumpings)} />
        <StatCard label="Run-outs" value={formatPoints(summary.runOuts)} />
      </div>

      {performancesQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" aria-hidden="true" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {performancesQuery.isError ? (
        <ErrorState
          title="Unable to load performance history"
          description="Please try again in a moment."
          onRetry={() => void performancesQuery.refetch()}
        />
      ) : null}

      {!performancesQuery.isLoading && !performancesQuery.isError ? (
        <PerformanceHistory performances={performances} />
      ) : null}
    </PageContainer>
  );
}
