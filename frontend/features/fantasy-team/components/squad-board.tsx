"use client";

import { Crown, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPlayerPrice, playerPositionLabels } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FantasyRules, Player, PlayerPosition } from "@/types/api";
import { POSITION_ORDER, getPlayerName } from "../utils";

export type PickerTarget = {
  position: PlayerPosition;
  playerId?: string;
};

function PlayerSlot({
  player,
  isCaptain,
  editable,
  onChange,
  onRemove,
  onMakeCaptain,
}: {
  player: Player;
  isCaptain: boolean;
  editable: boolean;
  onChange: () => void;
  onRemove: () => void;
  onMakeCaptain: () => void;
}) {
  return (
    <div
      className={cn(
        "min-h-32 rounded-md border bg-surface p-3",
        isCaptain ? "border-primary/50 ring-1 ring-primary/15" : "border-border",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{getPlayerName(player)}</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {formatPlayerPrice(player.price)}
          </p>
        </div>
        {isCaptain ? <Badge tone="primary">Captain</Badge> : null}
        {!player.active ? <Badge tone="danger">Inactive</Badge> : null}
      </div>

      {editable ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={isCaptain ? "secondary" : "outline"}
            onClick={onMakeCaptain}
            disabled={isCaptain}
            aria-pressed={isCaptain}
          >
            <Crown aria-hidden="true" />
            {isCaptain ? "Captain" : "Make Captain"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onChange}>
            <Pencil aria-hidden="true" />
            Change
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            icon={<Trash2 />}
            aria-label={`Remove ${getPlayerName(player)}`}
            title={`Remove ${getPlayerName(player)}`}
          >
            Remove player
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SquadBoard({
  players,
  captainId,
  rules,
  editable,
  onOpenPicker,
  onRemove,
  onMakeCaptain,
}: {
  players: Player[];
  captainId: string | null;
  rules: FantasyRules;
  editable: boolean;
  onOpenPicker: (target: PickerTarget) => void;
  onRemove: (playerId: string) => void;
  onMakeCaptain: (playerId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {POSITION_ORDER.map((position) => {
        const positionPlayers = players.filter(
          (player) => player.position === position,
        );
        const slots = Array.from(
          { length: rules.squad.positions[position] },
          (_, index) => positionPlayers[index],
        );

        return (
          <section key={position} aria-labelledby={`squad-${position}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id={`squad-${position}`} className="text-sm font-bold">
                  {playerPositionLabels[position]}
                  {rules.squad.positions[position] > 1 ? "s" : ""}
                </h3>
                <PositionBadge position={position} />
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                {positionPlayers.length} / {rules.squad.positions[position]}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map((player, index) =>
                player ? (
                  <PlayerSlot
                    key={player.id}
                    player={player}
                    isCaptain={captainId === player.id}
                    editable={editable}
                    onChange={() =>
                      onOpenPicker({ position, playerId: player.id })
                    }
                    onRemove={() => onRemove(player.id)}
                    onMakeCaptain={() => onMakeCaptain(player.id)}
                  />
                ) : (
                  <button
                    key={`${position}-${index}`}
                    type="button"
                    disabled={!editable}
                    onClick={() => onOpenPicker({ position })}
                    className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface-muted/45 px-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:cursor-default disabled:hover:border-border disabled:hover:bg-surface-muted/45 disabled:hover:text-muted-foreground"
                  >
                    <Plus className="mb-2 size-5" aria-hidden="true" />
                    Add {playerPositionLabels[position]}
                  </button>
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
