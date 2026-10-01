"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { RoundStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { formatDeadline } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useSeasonRounds } from "@/features/fantasy-team/hooks";
import { useAdminPlayers, useAdminPerformances, useSeasons } from "../hooks";
import { getOverviewRound } from "../utils";
import { AdminListLoading } from "../components/admin-data-list";
import { usePerformanceRound } from "./hooks";
import { useAdminNavigation, AdminLink } from "./navigation-guard";
import { PerformanceWorkspace } from "./performance-workspace";
import type { Round } from "@/types/api";

export function performanceUrl(seasonId: string, roundId?: string) {
  const query = new URLSearchParams({ seasonId });
  if (roundId) query.set("roundId", roundId);
  return `/admin/performances?${query}`;
}

function RoundWorkspace({ round }: { round: Round }) {
  const players = useAdminPlayers();
  const performances = useAdminPerformances(round.id);
  if (players.isLoading || performances.isLoading) return <AdminListLoading />;
  if (!players.data || !performances.data)
    return (
      <div role="alert">
        <ErrorState
          title="Unable to load performances"
          description="Please try again in a moment."
          onRetry={() => {
            void players.refetch();
            void performances.refetch();
          }}
        />
      </div>
    );
  return (
    <PerformanceWorkspace
      round={round}
      players={players.data.players}
      performances={performances.data.performances}
      refreshError={players.isError || performances.isError}
      onRetry={() => {
        void players.refetch();
        void performances.refetch();
      }}
    />
  );
}

export function PerformancePage() {
  const params = useSearchParams();
  const router = useRouter();
  const { request } = useAdminNavigation();
  const seasonsQuery = useSeasons();
  const seasons = seasonsQuery.data?.seasons ?? [];
  const urlRoundId = params.get("roundId") || undefined;
  const directRound = usePerformanceRound(urlRoundId);
  const seasonId =
    params.get("seasonId") ||
    directRound.data?.round.seasonId ||
    (seasons.find((season) => season.active) ?? seasons[0])?.id;
  const roundsQuery = useSeasonRounds(seasonId);
  const rounds = roundsQuery.data?.rounds ?? [];
  const round = urlRoundId ? directRound.data?.round : getOverviewRound(rounds);
  const invalidSelection =
    Boolean(
      seasonId &&
      seasonsQuery.isSuccess &&
      !seasons.some((season) => season.id === seasonId),
    ) || Boolean(round && seasonId && round.seasonId !== seasonId);

  useEffect(() => {
    if (
      seasonId &&
      round &&
      !invalidSelection &&
      (!urlRoundId || !params.get("seasonId"))
    )
      router.replace(performanceUrl(seasonId, round.id), { scroll: false });
  }, [seasonId, round, urlRoundId, invalidSelection, params, router]);

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        eyebrow="Admin / Performances"
        title="Performance Entry"
        description="Enter cricket statistics, review calculated points and finalise round results."
      />
      {seasonsQuery.isLoading ? (
        <AdminListLoading />
      ) : seasonsQuery.isError ? (
        <div role="alert">
          <ErrorState
            title="Unable to load seasons"
            onRetry={() => void seasonsQuery.refetch()}
          />
        </div>
      ) : !seasons.length ? (
        <EmptyState
          title="No fantasy seasons have been created."
          action={
            <Button asChild>
              <AdminLink href="/admin/seasons">Manage Seasons</AdminLink>
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Select
              label="Season"
              value={
                seasons.some((season) => season.id === seasonId) ? seasonId : ""
              }
              options={seasons.map((season) => ({
                value: season.id,
                label: `${season.name}${season.active ? " (Active)" : ""}`,
              }))}
              onValueChange={(id) => {
                if (id !== seasonId)
                  request(() => router.push(performanceUrl(id)));
              }}
            />
            <Select
              label="Round"
              value={
                rounds.some((item) => item.id === round?.id)
                  ? (round?.id ?? "")
                  : ""
              }
              disabled={roundsQuery.isLoading || !rounds.length}
              options={rounds.map((item) => ({
                value: item.id,
                label: `Round ${item.roundNumber} · ${item.name}`,
              }))}
              onValueChange={(id) => {
                if (id !== round?.id && seasonId)
                  request(() => router.push(performanceUrl(seasonId, id)));
              }}
            />
          </Card>
          {invalidSelection ? (
            <EmptyState
              title="This round or season is not available"
              description="Choose a valid season and round to continue."
            />
          ) : directRound.isError && urlRoundId ? (
            <div role="alert">
              <ErrorState
                title={
                  directRound.error instanceof ApiError &&
                  directRound.error.status === 404
                    ? "Round not found"
                    : "Unable to load round"
                }
                onRetry={() => void directRound.refetch()}
              />
            </div>
          ) : roundsQuery.isError ? (
            <div role="alert">
              <ErrorState
                title="Unable to load rounds"
                onRetry={() => void roundsQuery.refetch()}
              />
            </div>
          ) : roundsQuery.isLoading || (urlRoundId && directRound.isLoading) ? (
            <AdminListLoading />
          ) : !round ? (
            <EmptyState
              title="No rounds have been created for this season."
              action={
                <Button asChild>
                  <AdminLink href="/admin/rounds">Manage Rounds</AdminLink>
                </Button>
              }
            />
          ) : (
            <>
              <Card className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold">
                    Round {round.roundNumber} · {round.name}
                  </h2>
                  <RoundStatusBadge status={round.status} />
                </div>
                <p className="text-sm">
                  Deadline: {formatDeadline(round.deadline)} ·{" "}
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {round.status === "UPCOMING"
                    ? round.canEdit
                      ? "This round is still upcoming. User teams may still be editable."
                      : "This round is stored as upcoming, but team editing is locked because its deadline has passed."
                    : round.status === "LOCKED"
                      ? "Teams locked · Performance entry open"
                      : "Round completed · Results available for review"}
                </p>
              </Card>
              <RoundWorkspace key={round.id} round={round} />
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
}
