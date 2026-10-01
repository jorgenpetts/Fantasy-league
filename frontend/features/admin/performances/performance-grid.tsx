"use client";

import { Badge, PositionBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Player, PlayerPerformance } from "@/types/api";
import {
  draftFromPerformance,
  statFields,
  type Drafts,
  type PerformanceDraft,
  type RowErrors,
  type StatKey,
} from "./model";

type GridProps = {
  players: Player[];
  saved: Map<string, PlayerPerformance>;
  drafts: Drafts;
  errors: RowErrors;
  disabled: boolean;
  pointsAvailable: boolean;
  change: (playerId: string, value: PerformanceDraft) => void;
};

export function PerformanceGrid({
  players,
  saved,
  drafts,
  errors,
  disabled,
  change,
  pointsAvailable,
}: GridProps) {
  function identity(player: Player) {
    return (
      <div className="space-y-1">
        <p className="font-semibold">
          {player.firstName} {player.lastName}
        </p>
        <PositionBadge position={player.position} />
        {!player.active ? (
          <span className="block text-xs text-muted-foreground">Inactive</span>
        ) : null}
      </div>
    );
  }
  function status(player: Player) {
    return (
      <div className="space-y-2">
        <Badge
          tone={
            drafts[player.id]
              ? "warning"
              : saved.has(player.id)
                ? "success"
                : "neutral"
          }
        >
          {drafts[player.id]
            ? "Modified"
            : saved.has(player.id)
              ? "Entered"
              : "Not entered"}
        </Badge>
        {!saved.has(player.id) && !drafts[player.id] && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            className="h-auto min-h-11 whitespace-normal px-1 text-xs"
            onClick={() => change(player.id, draftFromPerformance())}
          >
            Record zero performance
          </Button>
        ) : null}
        {errors[player.id]?.row ? (
          <p role="alert" className="text-xs text-danger">
            {errors[player.id].row}
          </p>
        ) : null}
      </div>
    );
  }
  function points(player: Player) {
    return (
      <span
        aria-label={`${player.firstName} ${player.lastName} saved fantasy points`}
      >
        {!pointsAvailable
          ? "Unavailable"
          : saved.has(player.id)
            ? `${saved.get(player.id)!.fantasyPoints} pts`
            : "—"}
      </span>
    );
  }
  function batted(player: Player, draft: PerformanceDraft, compact = false) {
    return (
      <label className="inline-flex min-h-11 items-center gap-2 text-sm">
        <input
          className="size-5 accent-primary"
          type="checkbox"
          aria-label={`${player.firstName} ${player.lastName} batted`}
          checked={draft.didBat}
          disabled={disabled}
          onChange={(event) =>
            change(player.id, { ...draft, didBat: event.target.checked })
          }
        />
        {compact ? null : "Batted?"}
      </label>
    );
  }
  function stat(
    player: Player,
    draft: PerformanceDraft,
    key: StatKey,
    label: string,
    mobile: boolean,
  ) {
    const error = errors[player.id]?.[key];
    return (
      <Input
        id={`${mobile ? "card" : "table"}-${player.id}-${key}`}
        label={mobile ? label : undefined}
        aria-label={`${player.firstName} ${player.lastName} ${label}`}
        type="text"
        inputMode="numeric"
        value={draft[key]}
        disabled={disabled}
        error={error}
        onFocus={(event) => event.target.select()}
        onChange={(event) =>
          change(player.id, { ...draft, [key]: event.target.value })
        }
        className={mobile ? "min-h-11" : "min-h-11 px-1 text-center"}
      />
    );
  }
  return (
    <>
      <div className="hidden max-h-[70vh] overflow-auto rounded-card border border-border bg-surface xl:block">
        <table className="w-full min-w-[980px] table-fixed text-sm">
          <caption className="sr-only">
            Player performance entry. Fantasy points are the last saved backend
            results.
          </caption>
          <thead className="sticky top-0 z-10 border-b border-border bg-surface-muted text-left text-xs">
            <tr>
              <th scope="col" className="w-36 p-2">
                Player
              </th>
              <th scope="col" className="w-12 p-1">
                Batted?
              </th>
              {statFields.map(({ key, label }) => (
                <th scope="col" key={key} className="p-1">
                  {label}
                </th>
              ))}
              <th scope="col" className="w-20 p-1">
                Fantasy Pts
              </th>
              <th scope="col" className="w-28 p-1">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {players.map((player) => {
              const draft =
                drafts[player.id] ?? draftFromPerformance(saved.get(player.id));
              return (
                <tr
                  key={player.id}
                  className={drafts[player.id] ? "bg-warning/5" : ""}
                >
                  <th scope="row" className="p-2 text-left font-normal">
                    {identity(player)}
                  </th>
                  <td className="p-1">{batted(player, draft, true)}</td>
                  {statFields.map(({ key, label }) => (
                    <td key={key} className="p-1 align-top pt-3">
                      {stat(player, draft, key, label, false)}
                    </td>
                  ))}
                  <td className="p-1 text-center font-semibold">
                    {points(player)}
                  </td>
                  <td className="p-1">{status(player)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-4 xl:hidden">
        {players.map((player) => {
          const draft =
            drafts[player.id] ?? draftFromPerformance(saved.get(player.id));
          return (
            <Card
              key={player.id}
              className={drafts[player.id] ? "border-warning/40 p-4" : "p-4"}
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                {identity(player)}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Saved Fantasy Pts
                  </p>
                  <p className="font-bold">{points(player)}</p>
                  {status(player)}
                </div>
              </div>
              {["Batting", "Bowling", "Fielding"].map((group) => (
                <fieldset key={group} className="mb-4 min-w-0">
                  <legend className="mb-2 text-sm font-bold">{group}</legend>
                  {group === "Batting" ? batted(player, draft) : null}
                  <div className="grid grid-cols-2 gap-3">
                    {statFields
                      .filter((field) => field.group === group)
                      .map(({ key, label }) => (
                        <div key={key}>
                          {stat(player, draft, key, label, true)}
                        </div>
                      ))}
                  </div>
                </fieldset>
              ))}
            </Card>
          );
        })}
      </div>
    </>
  );
}
