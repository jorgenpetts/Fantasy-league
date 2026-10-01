"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { RoundStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { formatDeadline } from "@/lib/format";
import type { Round } from "@/types/api";
import { useSeasonRounds } from "@/features/fantasy-team/hooks";
import { useSeasons } from "../hooks";
import { AdminDataList, AdminListLoading } from "./admin-data-list";
import { CompleteRoundDialog, RoundEditor } from "./round-editor";

function RoundEditingState({ round }: { round: Round }) {
  return (
    <div className="space-y-2">
      <RoundStatusBadge status={round.status} />
      <p className="text-xs text-muted-foreground">
        {round.canEdit
          ? "Team editing open"
          : round.status === "UPCOMING" && round.isLocked
            ? "Team editing locked: deadline passed"
            : "Team editing locked"}
      </p>
    </div>
  );
}

export function RoundsManagement() {
  const seasonsQuery = useSeasons();
  const seasons = seasonsQuery.data?.seasons ?? [];
  const [selectedSeason, setSelectedSeason] = useState("");
  const seasonId = seasons.some((season) => season.id === selectedSeason)
    ? selectedSeason
    : (seasons.find((season) => season.active) ?? seasons[0])?.id;
  const roundsQuery = useSeasonRounds(seasonId);
  const rounds = roundsQuery.data?.rounds ?? [];
  const [editing, setEditing] = useState<Round | null | undefined>();
  const [completing, setCompleting] = useState<Round | null>(null);
  const refetch = roundsQuery.refetch;
  // Ask the backend for fresh editability at the next deadline; don't derive status locally.
  const nextDeadline = rounds
    .filter((round) => round.canEdit)
    .map((round) => new Date(round.deadline).getTime())
    .sort((a, b) => a - b)[0];
  useEffect(() => {
    if (!nextDeadline) return;
    const timer = window.setTimeout(
      () => void refetch(),
      Math.max(
        1_000,
        Math.min(nextDeadline - Date.now() + 1_000, 2_147_000_000),
      ),
    );
    return () => window.clearTimeout(timer);
  }, [nextDeadline, refetch]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin / Rounds"
        title="Rounds"
        description="Manage deadlines and fantasy-round status."
        actions={
          <Button
            onClick={() => setEditing(null)}
            disabled={!seasonId || seasonsQuery.isError}
          >
            Create Round
          </Button>
        }
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
          title="Create a season first"
          description="Rounds belong to a fantasy season."
          action={
            <Button asChild>
              <Link href="/admin/seasons">Manage Seasons</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="mb-5 p-5">
            <Select
              label="Filter by season"
              value={seasonId}
              onValueChange={setSelectedSeason}
              options={seasons.map((season) => ({
                value: season.id,
                label: `${season.name}${season.active ? " (Active)" : ""}`,
              }))}
            />
          </Card>
          {roundsQuery.isLoading ? (
            <AdminListLoading />
          ) : roundsQuery.isError ? (
            <div role="alert">
              <ErrorState
                title="Unable to load rounds"
                onRetry={() => void roundsQuery.refetch()}
              />
            </div>
          ) : rounds.length ? (
            <AdminDataList
              name="Rounds"
              items={rounds}
              columns={[
                {
                  label: "Round",
                  render: (round) => (
                    <span className="font-semibold">
                      Round {round.roundNumber} · {round.name}
                    </span>
                  ),
                },
                {
                  label: "Deadline",
                  render: (round) => (
                    <>
                      {formatDeadline(round.deadline)}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {Intl.DateTimeFormat().resolvedOptions().timeZone}
                      </span>
                    </>
                  ),
                },
                {
                  label: "Status / Editing",
                  render: (round) => <RoundEditingState round={round} />,
                },
              ]}
              actions={(round) => (
                <>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    aria-label={`Edit Round ${round.roundNumber}`}
                    onClick={() => setEditing(round)}
                  >
                    Edit
                  </Button>
                  <Button asChild variant="ghost" className="min-h-11">
                    <Link href={`/admin/performances?${new URLSearchParams({ seasonId: round.seasonId, roundId: round.id })}`}>Performances</Link>
                  </Button>
                  {round.status === "LOCKED" ? (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      aria-label={`Complete Round ${round.roundNumber}`}
                      onClick={() => setCompleting(round)}
                    >
                      Complete
                    </Button>
                  ) : null}
                </>
              )}
            />
          ) : (
            <EmptyState
              title="No rounds have been created for this season."
              action={
                <Button onClick={() => setEditing(null)}>Create Round</Button>
              }
            />
          )}
        </>
      )}
      {editing !== undefined && seasonId ? (
        <RoundEditor
          round={editing}
          seasonId={seasonId}
          seasons={seasons}
          rounds={rounds}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
      {completing ? (
        <CompleteRoundDialog
          round={completing}
          onClose={() => setCompleting(null)}
        />
      ) : null}
    </PageContainer>
  );
}
