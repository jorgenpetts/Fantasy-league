"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Save, Search } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/form-errors";
import type {
  CurrentUserLineup,
  FantasyRules,
  FantasyTeamStatus,
  Player,
  PlayerPosition,
} from "@/types/api";
import { type PlayerSort, usePlayers } from "@/features/players/hooks";
import { useSaveLineup } from "../hooks";
import {
  calculateProjectedTransfers,
  getDraftSignature,
  getPreviousPlayerIds,
  sortPlayersForMarket,
  validateDraft,
} from "../utils";
import { ChipControls } from "./chip-controls";
import { PlayerMarket } from "./player-market";
import { type PickerTarget, SquadBoard } from "./squad-board";
import { TeamSummary } from "./team-summary";
import { ValidationSummary } from "./validation-summary";

export function TeamBuilder({
  status,
  lineupState,
  rules,
  onAuthorityChange,
}: {
  status: FantasyTeamStatus;
  lineupState: CurrentUserLineup;
  rules: FantasyRules;
  onAuthorityChange: () => void;
}) {
  const sourceLineup = lineupState.lineup ?? lineupState.suggestedLineup;
  const [draftPlayers, setDraftPlayers] = useState<Player[]>(
    sourceLineup?.players ?? [],
  );
  const [captainId, setCaptainId] = useState<string | null>(
    sourceLineup?.captainId ?? null,
  );
  const [savedSignature, setSavedSignature] = useState(
    lineupState.lineup
      ? getDraftSignature(
          lineupState.lineup.players.map((player) => player.id),
          lineupState.lineup.captainId,
        )
      : "",
  );
  const [target, setTarget] = useState<PickerTarget | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketPosition, setMarketPosition] = useState<
    PlayerPosition | undefined
  >();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PlayerSort>("points-desc");
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const deferredSearch = useDeferredValue(search.trim());
  const editable = Boolean(status.round?.canEdit);
  const marketFilter = target?.position ?? marketPosition;
  const playersQuery = usePlayers(
    { position: marketFilter, search: deferredSearch, sort },
    editable,
  );
  const saveMutation = useSaveLineup(status.fantasyTeam!.id, status.round!.id);
  const { showToast } = useToast();

  const marketPlayers = useMemo(
    () => sortPlayersForMarket(playersQuery.data?.players ?? [], sort),
    [playersQuery.data?.players, sort],
  );
  const validation = useMemo(
    () => validateDraft(draftPlayers, captainId, rules),
    [captainId, draftPlayers, rules],
  );
  const draftSignature = getDraftSignature(
    draftPlayers.map((player) => player.id),
    captainId,
  );
  const isDirty = draftSignature !== savedSignature;
  const previousPlayerIds = useMemo(
    () =>
      getPreviousPlayerIds(
        lineupState.lineup,
        lineupState.suggestedLineup,
        lineupState.previousLineup,
      ),
    [
      lineupState.lineup,
      lineupState.previousLineup,
      lineupState.suggestedLineup,
    ],
  );
  const projectedTransfers = useMemo(
    () =>
      calculateProjectedTransfers(
        previousPlayerIds,
        draftPlayers.map((player) => player.id),
        rules,
        status.chips?.active === "WILDCARD",
      ),
    [draftPlayers, previousPlayerIds, rules, status.chips?.active],
  );
  const selectedIds = useMemo(
    () => new Set(draftPlayers.map((player) => player.id)),
    [draftPlayers],
  );
  const replacementCredit = target?.playerId
    ? (draftPlayers.find((player) => player.id === target.playerId)?.price ?? 0)
    : 0;

  useEffect(() => {
    if (!isDirty) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  function openPicker(nextTarget: PickerTarget) {
    setTarget(nextTarget);
    setSearch("");
    const useDrawer = window.matchMedia("(max-width: 1279px)").matches;
    setMarketOpen(useDrawer);
    if (!useDrawer) document.getElementById("desktop-player-search")?.focus();
  }

  function browsePlayers() {
    setTarget(null);
    setMarketPosition(undefined);
    setSearch("");
    setMarketOpen(true);
  }

  function selectPlayer(player: Player) {
    if (!editable || selectedIds.has(player.id) || !player.active) return;

    if (target) {
      if (player.position !== target.position) return;
      setDraftPlayers((current) => [
        ...current.filter((item) => item.id !== target.playerId),
        player,
      ]);
      if (target.playerId === captainId) setCaptainId(player.id);
    } else {
      const positionCount = draftPlayers.filter(
        (item) => item.position === player.position,
      ).length;
      if (positionCount >= rules.squad.positions[player.position]) return;
      setDraftPlayers((current) => [...current, player]);
    }

    setTarget(null);
    setMarketOpen(false);
  }

  function removePlayer(playerId: string) {
    setDraftPlayers((current) =>
      current.filter((player) => player.id !== playerId),
    );
    if (captainId === playerId) setCaptainId(null);
  }

  async function saveDraft() {
    if (!captainId || !validation.isValid || !editable || saveMutation.isPending) return;
    setSaveError(undefined);

    try {
      await saveMutation.mutateAsync({
        playerIds: draftPlayers.map((player) => player.id),
        captainId,
      });
      setSavedSignature(draftSignature);
      setSaveConfirmationOpen(false);
      showToast({
        title: "Team saved successfully",
        description: "Your current-round lineup is up to date.",
        variant: "success",
      });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Your team could not be saved.",
      );
      setSaveError(message);
      setSaveConfirmationOpen(false);
      showToast({
        title: "Team not saved",
        description: message,
        variant: "error",
      });
      onAuthorityChange();
    }
  }

  function requestSave() {
    if (projectedTransfers.transferPenalty > 0) {
      setSaveConfirmationOpen(true);
      return;
    }
    void saveDraft();
  }

  const market = (idPrefix: string) => (
    <PlayerMarket
      idPrefix={idPrefix}
      players={marketPlayers}
      selectedIds={selectedIds}
      counts={validation.counts}
      rules={rules}
      draftValue={validation.squadValue}
      replacementCredit={replacementCredit}
      target={target}
      position={marketPosition}
      search={search}
      sort={sort}
      isLoading={playersQuery.isLoading}
      isError={playersQuery.isError}
      onSearchChange={setSearch}
      onPositionChange={setMarketPosition}
      onSortChange={setSort}
      onSelect={selectPlayer}
      onRetry={() => void playersQuery.refetch()}
    />
  );

  return (
    <div className="space-y-5">
      <TeamSummary
        status={status}
        selectedCount={draftPlayers.length}
        squadSize={rules.squad.size}
        squadValue={validation.squadValue}
        budget={rules.squad.budget}
        transfers={status.transfers}
        projected={projectedTransfers}
        isDirty={isDirty}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Current Squad</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!editable && !lineupState.lineup
                    ? "Showing your latest saved squad."
                    : lineupState.lineup
                      ? "Your saved lineup for this round."
                      : lineupState.suggestedLineup
                        ? "Carried forward from your previous round. Save to confirm it."
                        : "Fill every positional slot, then choose a captain."}
                </p>
              </div>
              {editable ? (
                <Button
                  className="xl:hidden"
                  onClick={browsePlayers}
                  icon={<Search />}
                >
                  Browse Players
                </Button>
              ) : null}
              {isDirty && editable ? (
                <Badge tone="warning">Unsaved changes</Badge>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-5">
              <SquadBoard
                players={draftPlayers}
                captainId={captainId}
                rules={rules}
                editable={editable}
                onOpenPicker={openPicker}
                onRemove={removePlayer}
                onMakeCaptain={setCaptainId}
              />

              {editable ? (
                <>
                  <ValidationSummary
                    isValid={validation.isValid}
                    issues={validation.issues}
                    overBudgetBy={Math.max(0, -validation.remainingBudget)}
                  />
                  {saveError ? (
                    <p
                      className="text-sm font-semibold text-danger"
                      role="alert"
                    >
                      {saveError}
                    </p>
                  ) : null}
                  <div
                    className={`flex flex-col gap-3 rounded-md border border-border bg-surface/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between ${isDirty ? "sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 xl:bottom-4" : ""}`}
                  >
                    <div className="text-sm">
                      <p className="font-bold">
                        {validation.isValid
                          ? "Ready to save"
                          : "Complete your squad to save"}
                      </p>
                      <p className="text-muted-foreground">
                        {projectedTransfers.transferPenalty > 0
                          ? `Projected deduction: -${projectedTransfers.transferPenalty} pts`
                          : "No projected transfer deduction"}
                      </p>
                    </div>
                    <Button
                      onClick={requestSave}
                      disabled={!isDirty || !validation.isValid}
                      isLoading={saveMutation.isPending}
                      icon={<Save />}
                    >
                      Save Team
                    </Button>
                  </div>
                </>
              ) : sourceLineup ? (
                <div className="grid gap-3 rounded-md bg-surface-muted p-4 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Round points</span>
                    <p className="mt-1 font-black">
                      {sourceLineup.roundPoints} pts
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gross points</span>
                    <p className="mt-1 font-black">
                      {sourceLineup.grossPoints} pts
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Transfer deduction
                    </span>
                    <p className="mt-1 font-black">
                      -{sourceLineup.transfers.transferPenalty} pts
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Free transfers
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {projectedTransfers.freeTransfers}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Transfers made
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {isDirty
                      ? projectedTransfers.transfersMade
                      : status.transfers.transfersMade}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Extra transfers
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {isDirty
                      ? projectedTransfers.extraTransfers
                      : status.transfers.extraTransfers}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    Deduction
                  </p>
                  <p className="mt-1 text-lg font-black">
                    -
                    {isDirty
                      ? projectedTransfers.transferPenalty
                      : status.transfers.transferPenalty}{" "}
                    pts
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <ChipControls
                  teamId={status.fantasyTeam!.id}
                  roundId={status.round!.id}
                  chips={status.chips}
                  editable={editable}
                  onAuthorityChange={onAuthorityChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {editable ? (
          <Card className="sticky top-20 hidden h-[calc(100dvh-6rem)] overflow-hidden xl:block">
            {market("desktop")}
          </Card>
        ) : null}
      </div>

      <DialogRoot open={marketOpen && editable} onOpenChange={setMarketOpen}>
        <DialogContent className="h-[calc(100dvh-2rem)] max-h-none max-w-none overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Player Market</DialogTitle>
            <DialogDescription>
              Search and select an active player for your fantasy squad.
            </DialogDescription>
          </DialogHeader>
          <div className="h-full pt-10">{market("mobile")}</div>
        </DialogContent>
      </DialogRoot>

      <Dialog
        open={saveConfirmationOpen}
        title="Confirm Transfers"
        description={`You are making ${projectedTransfers.transfersMade} transfers. ${projectedTransfers.freeTransfers} are free and ${projectedTransfers.extraTransfers} additional transfers will cost ${projectedTransfers.transferPenalty} points.`}
        confirmLabel={`Save Team (-${projectedTransfers.transferPenalty} pts)`}
        onConfirm={() => void saveDraft()}
        onClose={() => setSaveConfirmationOpen(false)}
        isConfirming={saveMutation.isPending}
      />
    </div>
  );
}
