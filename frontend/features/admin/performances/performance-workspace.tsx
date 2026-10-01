"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/state";
import type { Player, PlayerPerformance, Round } from "@/types/api";
import { CompleteRoundDialog } from "../components/round-editor";
import { usePerformanceMutations } from "./hooks";
import { performanceError } from "./errors";
import { useAdminNavigation, AdminLink } from "./navigation-guard";
import {
  matchesSaved,
  performancePlayers,
  performanceProgress,
  prepareBulkSave,
  type PerformanceDraft,
  type RowErrors,
  type ScoringSummary,
} from "./model";
import { PerformanceGrid } from "./performance-grid";

export function PerformanceWorkspace({
  round,
  players,
  performances,
  refreshError,
  onRetry,
}: {
  round: Round;
  players: Player[];
  performances: PlayerPerformance[];
  refreshError: boolean;
  onRetry: () => void;
}) {
  const { drafts: allDrafts, updateDrafts, register } = useAdminNavigation();
  const drafts = allDrafts[round.id] ?? {};
  const dirtyCount = Object.keys(drafts).length;
  const mutation = usePerformanceMutations(round.id);
  const busy = mutation.save.isPending || mutation.recalculate.isPending;
  const operation = useRef(false);
  const [corrections, setCorrections] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [errors, setErrors] = useState<RowErrors>({});
  const [message, setMessage] = useState("");
  const [dialog, setDialog] = useState<
    "discard" | "recalculate" | "complete" | null
  >(null);
  const [summary, setSummary] = useState<{
    kind: string;
    result: ScoringSummary;
  } | null>(null);
  const saved = useMemo(
    () =>
      new Map(
        performances.map((performance) => [performance.playerId, performance]),
      ),
    [performances],
  );
  const roster = useMemo(
    () => performancePlayers(players, performances),
    [players, performances],
  );
  const progress = performanceProgress(roster, performances);
  const disabled =
    busy || refreshError || (round.status === "COMPLETED" && !corrections);
  const visiblePlayers = roster.filter(
    (player) =>
      `${player.firstName} ${player.lastName}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (filter === "ALL" ||
        (filter === "ENTERED"
          ? saved.has(player.id)
          : filter === "OUTSTANDING"
            ? !saved.has(player.id)
            : Boolean(drafts[player.id]))),
  );

  const discard = useCallback(() => {
    updateDrafts(round.id, () => ({}));
    setErrors({});
    setMessage("");
  }, [round.id, updateDrafts]);

  useEffect(() => {
    register({ dirty: dirtyCount > 0, busy, discard });
    return () => register(null);
  }, [register, dirtyCount, busy, discard]);

  useEffect(() => {
    if (!dirtyCount && !busy) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirtyCount, busy]);

  function change(playerId: string, value: PerformanceDraft) {
    if (disabled) return;
    updateDrafts(round.id, (current) => {
      const next = { ...current };
      if (matchesSaved(value, saved.get(playerId))) delete next[playerId];
      else next[playerId] = value;
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  }

  async function save() {
    if (operation.current || disabled || !dirtyCount) return;
    const input = prepareBulkSave(drafts);
    setErrors(input.errors);
    if (Object.keys(input.errors).length) {
      setMessage("Please correct the highlighted fields before saving.");
      setFilter("ALL");
      setSearch("");
      requestAnimationFrame(() => {
        const invalid = [
          ...document.querySelectorAll<HTMLInputElement>(
            'input[aria-invalid="true"]',
          ),
        ].find((element) => element.getClientRects().length);
        invalid?.focus();
      });
      return;
    }
    operation.current = true;
    setMessage("");
    try {
      const result = await mutation.save.mutateAsync(input.performances);
      updateDrafts(round.id, () => ({}));
      setSummary({ kind: "Saved and recalculated", result });
      setCorrections(false);
      toast.success("Performances saved and scores recalculated successfully.");
    } catch (error) {
      const mapped = performanceError(error, input.performances);
      setErrors(mapped.fields);
      setMessage(mapped.message);
      setFilter("ALL");
      setSearch("");
    } finally {
      operation.current = false;
    }
  }

  async function recalculate() {
    if (operation.current || dirtyCount) return;
    operation.current = true;
    setMessage("");
    try {
      const result = await mutation.recalculate.mutateAsync();
      setSummary({ kind: "Recalculated", result });
      toast.success("Round recalculated successfully.");
      setDialog(null);
    } catch {
      setMessage(
        "Unable to recalculate this round. Saved performances have been kept. Please try again.",
      );
    } finally {
      operation.current = false;
    }
  }

  if (!roster.length)
    return (
      <EmptyState
        title="No players are available for performance entry."
        action={
          <Button asChild>
            <AdminLink href="/admin/players">Manage Players</AdminLink>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-5">
      <Card className="space-y-2 p-5">
        <h2 className="text-lg font-semibold">Performance Progress</h2>
        <p className="font-bold">
          {progress.entered} / {progress.total} listed players entered ·{" "}
          {progress.outstanding} not entered
        </p>
        <p className="text-sm text-muted-foreground">
          Includes inactive players. Not every listed player necessarily played
          this round. An entered zero performance counts as a saved record.
        </p>
        <p className="text-sm text-muted-foreground">
          Saving changes recalculates the round automatically. Fantasy points
          show saved results; unsaved edits are not included.
        </p>
      </Card>
      {round.status === "COMPLETED" ? (
        <Card className="space-y-3 border-warning/40 p-5">
          <h2 className="font-semibold">Round completed</h2>
          <p className="text-sm">
            Editing these performances may change historical fantasy scores and
            leaderboard positions.
          </p>
          {!corrections ? (
            <Button
              variant="outline"
              disabled={busy || refreshError}
              onClick={() => setCorrections(true)}
            >
              Edit Completed Results
            </Button>
          ) : (
            <p className="text-sm font-semibold">
              Correction mode — save changes to recalculate the historical
              results.
            </p>
          )}
        </Card>
      ) : null}
      {refreshError ? (
        <div role="alert">
          <ErrorState
            title="Unable to refresh saved performances"
            description="Saved fantasy points are unavailable until the refresh succeeds. Your draft values are preserved."
            onRetry={onRetry}
          />
        </div>
      ) : null}
      {summary ? (
        <Card className="space-y-1 p-5" role="status">
          <h2 className="font-bold">{summary.kind} successfully</h2>
          <p className="text-sm">
            {summary.result.performancesProcessed} performances processed ·{" "}
            {summary.result.lineupsProcessed} fantasy lineups updated ·{" "}
            {summary.result.fantasyTeamsUpdated} fantasy teams updated
          </p>
          <p className="text-xs text-muted-foreground">
            Result of your last successful operation on this round.
          </p>
        </Card>
      ) : null}
      {message && dialog !== "recalculate" ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
        >
          {message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Search performances"
          name="performance-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label="Entry status"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "ALL", label: "All players" },
            { value: "ENTERED", label: "Entered" },
            { value: "OUTSTANDING", label: "Outstanding" },
            { value: "MODIFIED", label: "Modified" },
          ]}
        />
      </div>
      {visiblePlayers.length ? (
        <PerformanceGrid
          players={visiblePlayers}
          saved={saved}
          drafts={drafts}
          errors={errors}
          disabled={disabled}
          change={change}
          pointsAvailable={!refreshError}
        />
      ) : (
        <EmptyState
          title="No players match these filters"
          action={
            <Button
              variant="outline"
              onClick={() => {
                setFilter("ALL");
                setSearch("");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      )}
      <Card
        className={`flex flex-wrap items-center justify-between gap-3 border-primary/20 p-4 shadow-md ${dirtyCount ? "sticky bottom-[env(safe-area-inset-bottom)] z-20" : ""}`}
      >
        <p className="text-sm font-semibold" role="status">
          {dirtyCount} unsaved {dirtyCount === 1 ? "player" : "players"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!dirtyCount || busy}
            onClick={() => setDialog("discard")}
          >
            Discard Changes
          </Button>
          <Button
            disabled={!dirtyCount || disabled}
            isLoading={mutation.save.isPending}
            onClick={() => void save()}
          >
            {mutation.save.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>
      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Review and Finalise</h2>
        <p className="text-sm text-muted-foreground">
          Recalculation uses saved performances to update player points, fantasy
          lineups and team totals.
        </p>
        {dirtyCount ? (
          <p className="text-sm">
            Save or discard your changes before recalculating or completing this
            round.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || Boolean(dirtyCount) || refreshError}
            onClick={() => {
              setMessage("");
              setDialog("recalculate");
            }}
          >
            Recalculate Scores
          </Button>
          {round.status === "LOCKED" ? (
            <Button
              variant="outline"
              disabled={busy || Boolean(dirtyCount) || refreshError}
              onClick={() => setDialog("complete")}
            >
              Complete Round
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <AdminLink href="/leaderboard">View Leaderboard</AdminLink>
          </Button>
        </div>
      </Card>
      <Dialog
        open={dialog === "discard"}
        title="Discard performance changes?"
        description="Restore the last saved performance values for this round?"
        confirmLabel="Discard Changes"
        onClose={() => setDialog(null)}
        onConfirm={() => {
          discard();
          setDialog(null);
        }}
      />
      <Dialog
        open={dialog === "recalculate"}
        title={`Recalculate Round ${round.roundNumber}?`}
        description="This will recalculate player fantasy points, fantasy-team round scores and season totals using the current saved performance data."
        confirmLabel="Recalculate"
        isConfirming={mutation.recalculate.isPending}
        onClose={() => {
          if (!operation.current) setDialog(null);
        }}
        onConfirm={() => void recalculate()}
      >
        {message ? (
          <p role="alert" className="text-sm text-danger">
            {message}
          </p>
        ) : null}
      </Dialog>
      {dialog === "complete" ? (
        <CompleteRoundDialog round={round} onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
