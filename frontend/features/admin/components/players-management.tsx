"use client";

import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { formatPlayerPrice } from "@/lib/format";
import type { Player, PlayerPosition } from "@/types/api";
import { useAdminPlayers } from "../hooks";
import { AdminDataList, AdminListLoading } from "./admin-data-list";
import { PlayerEditor, positionOptions } from "./player-editor";

export function PlayersManagement() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [position, setPosition] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState<Player | null | undefined>();
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useAdminPlayers({
    search: debouncedSearch || undefined,
    position: position === "ALL" ? undefined : (position as PlayerPosition),
    active: status === "ALL" ? undefined : status === "ACTIVE",
  });
  const players = query.data?.players ?? [];
  const filtered = Boolean(search || position !== "ALL" || status !== "ALL");
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Admin / Players"
        title="Players"
        description="Manage the cricketers available in the fantasy competition."
        actions={<Button onClick={() => setEditing(null)}>Add Player</Button>}
      />
      <Card className="mb-5 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        <Input
          label="Search players"
          type="search"
          name="admin-player-search"
          maxLength={120}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name"
        />
        <Select
          label="Position filter"
          value={position}
          onValueChange={setPosition}
          options={[
            { value: "ALL", label: "All positions" },
            ...positionOptions,
          ]}
        />
        <Select
          label="Player status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "ALL", label: "All players" },
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
        />
      </Card>
      {query.isLoading ? (
        <AdminListLoading />
      ) : query.isError ? (
        <div role="alert">
          <ErrorState
            title="Unable to load players"
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : players.length ? (
        <AdminDataList
          name="Players"
          items={players}
          columns={[
            {
              label: "Player",
              render: (player) => (
                <span className="font-semibold">
                  {player.firstName} {player.lastName}
                </span>
              ),
            },
            {
              label: "Position",
              render: (player) => <PositionBadge position={player.position} />,
            },
            {
              label: "Price",
              render: (player) => formatPlayerPrice(player.price),
            },
            {
              label: "Status",
              render: (player) => (
                <Badge tone={player.active ? "success" : "neutral"}>
                  {player.active ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          actions={(player) => (
            <Button
              variant="outline"
              className="min-h-11"
              aria-label={`Edit ${player.firstName} ${player.lastName}`}
              onClick={() => setEditing(player)}
            >
              Edit
            </Button>
          )}
        />
      ) : (
        <EmptyState
          title={
            filtered
              ? "No players match your filters"
              : "No players have been created yet."
          }
          action={
            filtered ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                  setPosition("ALL");
                  setStatus("ALL");
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => setEditing(null)}>Add First Player</Button>
            )
          }
        />
      )}
      {editing !== undefined ? (
        <PlayerEditor player={editing} onClose={() => setEditing(undefined)} />
      ) : null}
    </PageContainer>
  );
}
