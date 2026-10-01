"use client";

import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { formatSeasonDate } from "@/lib/date-time";
import type { Season } from "@/types/api";
import { useSeasons } from "../hooks";
import { AdminDataList, AdminListLoading } from "./admin-data-list";
import { SeasonEditor } from "./season-editor";

export function SeasonsManagement() {
  const query = useSeasons();
  const [editing, setEditing] = useState<Season | null | undefined>();
  const seasons = query.data?.seasons ?? [];
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin / Seasons"
        title="Seasons"
        description="Manage fantasy competitions and the active season."
        actions={
          <Button onClick={() => setEditing(null)}>Create Season</Button>
        }
      />
      {query.isLoading ? (
        <AdminListLoading />
      ) : query.isError ? (
        <div role="alert">
          <ErrorState
            title="Unable to load seasons"
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : seasons.length ? (
        <AdminDataList
          name="Seasons"
          items={seasons}
          columns={[
            {
              label: "Season",
              render: (season) => (
                <span className="font-semibold">{season.name}</span>
              ),
            },
            {
              label: "Dates",
              render: (season) => (
                <>
                  {formatSeasonDate(season.startDate)} –{" "}
                  {formatSeasonDate(season.endDate)}
                </>
              ),
            },
            {
              label: "Status",
              render: (season) => (
                <Badge tone={season.active ? "success" : "neutral"}>
                  {season.active ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          actions={(season) => (
            <Button
              variant="outline"
              className="min-h-11"
              aria-label={`Edit ${season.name}`}
              onClick={() => setEditing(season)}
            >
              Edit
            </Button>
          )}
        />
      ) : (
        <EmptyState
          title="No fantasy seasons have been created."
          action={
            <Button onClick={() => setEditing(null)}>Create Season</Button>
          }
        />
      )}
      {editing !== undefined ? (
        <SeasonEditor season={editing} onClose={() => setEditing(undefined)} />
      ) : null}
    </PageContainer>
  );
}
