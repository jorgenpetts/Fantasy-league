"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/state";
import {
  formatPlayerPrice,
  formatPoints,
  playerPositionLabels,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Player, PlayerPosition } from "@/types/api";
import { type PlayerSort, usePlayers } from "../hooks";

const positionOptions: Array<{ label: string; value: "ALL" | PlayerPosition }> = [
  { label: "All", value: "ALL" },
  { label: playerPositionLabels.WICKET_KEEPER, value: "WICKET_KEEPER" },
  { label: playerPositionLabels.BATTER, value: "BATTER" },
  { label: playerPositionLabels.ALL_ROUNDER, value: "ALL_ROUNDER" },
  { label: playerPositionLabels.BOWLER, value: "BOWLER" },
];

const sortOptions: Array<{ label: string; value: PlayerSort }> = [
  { label: "Fantasy points - highest", value: "points-desc" },
  { label: "Price - highest", value: "price-desc" },
  { label: "Price - lowest", value: "price-asc" },
  { label: "Name - A-Z", value: "name-asc" },
];

function getPlayerName(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

function isPlayerPosition(value: string | null): value is PlayerPosition {
  return (
    value === "WICKET_KEEPER" ||
    value === "BATTER" ||
    value === "ALL_ROUNDER" ||
    value === "BOWLER"
  );
}

function isPlayerSort(value: string | null): value is PlayerSort {
  return (
    value === "points-desc" ||
    value === "price-desc" ||
    value === "price-asc" ||
    value === "name-asc"
  );
}

function sortPlayers(players: Player[], sort: PlayerSort) {
  return [...players].sort((a, b) => {
    if (sort === "points-desc") {
      return (b.totalFantasyPoints ?? 0) - (a.totalFantasyPoints ?? 0);
    }

    if (sort === "price-desc") {
      return b.price - a.price;
    }

    if (sort === "price-asc") {
      return a.price - b.price;
    }

    return getPlayerName(a).localeCompare(getPlayerName(b));
  });
}

function PlayerListSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function SearchInput({
  initialValue,
  onSearchChange,
}: {
  initialValue: string;
  onSearchChange: (value: string) => void;
}) {
  const [search, setSearch] = useState(initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearchChange(search);
    }, 300);

    // A queued search must not send a quick player-link tap back to the directory.
    function cancelOnNavigation(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link && new URL(link.getAttribute("href")!, window.location.href).pathname !== window.location.pathname) window.clearTimeout(timer);
    }
    document.addEventListener("click", cancelOnNavigation, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", cancelOnNavigation, true);
    };
  }, [onSearchChange, search]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-9 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        label="Search players"
        name="player-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name"
        className="pl-9"
      />
    </div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="grid gap-3 rounded-md border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[1.3fr_0.8fr_0.6fr_0.6fr] sm:items-center"
    >
      <div className="min-w-0">
        <p className="text-base font-bold">{getPlayerName(player)}</p>
        {!player.active ? (
          <Badge className="mt-2" tone="neutral">
            Inactive
          </Badge>
        ) : null}
      </div>
      <div>
        <PositionBadge position={player.position} />
      </div>
      <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
        <span className="text-xs font-semibold text-muted-foreground sm:hidden">
          Price
        </span>
        <span className="font-bold">{formatPlayerPrice(player.price)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
        <span className="text-xs font-semibold text-muted-foreground sm:hidden">
          Points
        </span>
        <span className="font-black">
          {formatPoints(player.totalFantasyPoints ?? 0)} pts
        </span>
      </div>
    </Link>
  );
}

export function PlayersDirectoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const positionParam = searchParams.get("position");
  const sortParam = searchParams.get("sort");
  const position: PlayerPosition | undefined = isPlayerPosition(positionParam)
    ? positionParam
    : undefined;
  const sort: PlayerSort = isPlayerSort(sortParam) ? sortParam : "points-desc";
  const urlSearch = searchParams.get("search") ?? "";
  const playersQuery = usePlayers({ position, search: urlSearch, sort });
  const players = useMemo(
    () => sortPlayers(playersQuery.data?.players ?? [], sort),
    [playersQuery.data?.players, sort],
  );

  function updateParam(name: string, value?: string) {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    const trimmed = value.trim();

    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, {
        scroll: false,
      });
    }
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Players"
        title="Player Directory"
        description="Browse available fantasy cricket players, compare prices and review their performance."
      />

      <Card className="mb-5">
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <SearchInput
              key={urlSearch}
              initialValue={urlSearch}
              onSearchChange={updateSearch}
            />
            <Select
              label="Sort"
              value={sort}
              options={sortOptions}
              onValueChange={(value) => updateParam("sort", value)}
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Position
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {positionOptions.map((option) => {
                const active = (position ?? "ALL") === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateParam(
                        "position",
                        option.value === "ALL" ? undefined : option.value,
                      )
                    }
                    className={cn(
                      "min-h-11 shrink-0 rounded-md border px-3 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-surface-muted",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {playersQuery.isLoading ? <PlayerListSkeleton /> : null}

      {playersQuery.isError ? (
        <ErrorState
          title="Unable to load players"
          description="Please try again in a moment."
          onRetry={() => void playersQuery.refetch()}
        />
      ) : null}

      {!playersQuery.isLoading && !playersQuery.isError ? (
        players.length > 0 ? (
          <Card>
            <CardContent>
              <div className="mb-3 hidden grid-cols-[1.3fr_0.8fr_0.6fr_0.6fr] px-4 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground sm:grid">
                <span>Player</span>
                <span>Position</span>
                <span className="text-right">Price</span>
                <span className="text-right">Points</span>
              </div>
              <div className="space-y-2">
                {players.map((player) => (
                  <PlayerRow key={player.id} player={player} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            title="No players found"
            description="No active players match your current filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            }
          />
        )
      ) : null}
    </PageContainer>
  );
}
