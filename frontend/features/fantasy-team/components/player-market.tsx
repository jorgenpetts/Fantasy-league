"use client";

import { Search, UserPlus } from "lucide-react";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/state";
import {
  formatPlayerPrice,
  formatPoints,
  playerPositionLabels,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FantasyRules, Player, PlayerPosition } from "@/types/api";
import type { PlayerSort } from "@/features/players/hooks";
import { POSITION_ORDER, getPlayerName } from "../utils";
import type { PickerTarget } from "./squad-board";

const sortOptions: Array<{ label: string; value: PlayerSort }> = [
  { label: "Points - highest", value: "points-desc" },
  { label: "Price - lowest", value: "price-asc" },
  { label: "Price - highest", value: "price-desc" },
  { label: "Name - A-Z", value: "name-asc" },
];

export function PlayerMarket({
  idPrefix,
  players,
  selectedIds,
  counts,
  rules,
  draftValue,
  replacementCredit,
  target,
  position,
  search,
  sort,
  isLoading,
  isError,
  onSearchChange,
  onPositionChange,
  onSortChange,
  onSelect,
  onRetry,
}: {
  idPrefix: string;
  players: Player[];
  selectedIds: Set<string>;
  counts: Record<PlayerPosition, number>;
  rules: FantasyRules;
  draftValue: number;
  replacementCredit: number;
  target: PickerTarget | null;
  position?: PlayerPosition;
  search: string;
  sort: PlayerSort;
  isLoading: boolean;
  isError: boolean;
  onSearchChange: (value: string) => void;
  onPositionChange: (position?: PlayerPosition) => void;
  onSortChange: (sort: PlayerSort) => void;
  onSelect: (player: Player) => void;
  onRetry: () => void;
}) {
  const availableBudget = Math.max(
    0,
    rules.squad.budget - draftValue + replacementCredit,
  );
  const contextLabel = target
    ? target.playerId
      ? `Choose a replacement ${playerPositionLabels[target.position].toLowerCase()}`
      : `Choose a ${playerPositionLabels[target.position].toLowerCase()}`
    : "Browse available players";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="max-h-[60%] shrink-0 overflow-y-auto border-b border-border p-4 sm:p-5">
        <h2 className="text-lg font-bold">Player Market</h2>
        <p className="mt-1 text-sm text-muted-foreground">{contextLabel}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px] xl:grid-cols-1 2xl:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={`${idPrefix}-player-search`}
              aria-label="Search available players"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search players"
              className="pl-9"
            />
          </div>
          <Select
            value={sort}
            options={sortOptions}
            onValueChange={(value) => onSortChange(value as PlayerSort)}
            ariaLabel="Sort available players"
          />
        </div>

        {target ? (
          <div className="mt-3 flex flex-wrap gap-2 items-center justify-between rounded-md bg-surface-muted px-3 py-2 text-sm">
            <span className="font-semibold">
              {playerPositionLabels[target.position]} only
            </span>
            <span className="text-muted-foreground">
              Up to {formatPlayerPrice(availableBudget)}
            </span>
          </div>
        ) : (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onPositionChange(undefined)}
              className={cn(
                "min-h-11 shrink-0 rounded-md border px-3 py-2 text-xs font-bold",
                !position
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:bg-surface-muted",
              )}
            >
              All
            </button>
            {POSITION_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onPositionChange(option)}
                className={cn(
                  "min-h-11 shrink-0 rounded-md border px-3 py-2 text-xs font-bold",
                  position === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface hover:bg-surface-muted",
                )}
              >
                {playerPositionLabels[option]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <ErrorState
            title="Unable to load players"
            description="Please try loading the player market again."
            onRetry={onRetry}
          />
        ) : null}

        {!isLoading && !isError && players.length === 0 ? (
          <EmptyState
            title="No players found"
            description="Try a different search or position filter."
          />
        ) : null}

        {!isLoading && !isError && players.length > 0 ? (
          <div className="space-y-2">
            {players.map((player) => {
              const selected = selectedIds.has(player.id);
              const wrongPosition = Boolean(
                target && player.position !== target.position,
              );
              const positionFull =
                !target &&
                counts[player.position] >= rules.squad.positions[player.position];
              const unaffordable = player.price > availableBudget;
              const disabled =
                selected || wrongPosition || positionFull || unaffordable;
              const reason = selected
                ? "Selected"
                : unaffordable
                  ? "Insufficient budget"
                  : positionFull
                    ? "Position full"
                    : null;

              return (
                <div
                  key={player.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border p-3",
                    disabled ? "bg-surface-muted/55" : "bg-surface",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="font-bold">{getPlayerName(player)}</p>
                      <PositionBadge position={player.position} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-bold">
                        {formatPlayerPrice(player.price)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatPoints(player.totalFantasyPoints ?? 0)} pts
                      </span>
                      {reason ? (
                        <Badge tone={selected ? "success" : "warning"}>
                          {reason}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={selected ? "secondary" : "outline"}
                    disabled={disabled}
                    onClick={() => onSelect(player)}
                    icon={<UserPlus />}
                    aria-label={`${target?.playerId ? "Replace with" : "Select"} ${getPlayerName(player)}`}
                    title={`${target?.playerId ? "Replace with" : "Select"} ${getPlayerName(player)}`}
                  >
                    {target?.playerId ? "Replace" : "Select"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
