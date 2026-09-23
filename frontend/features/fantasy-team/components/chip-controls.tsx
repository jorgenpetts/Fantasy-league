"use client";

import { Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/form-errors";
import type { ChipStatus, ChipType } from "@/types/api";
import { useActivateChip, useRemoveChip } from "../hooks";

const chipDetails: Record<
  ChipType,
  { title: string; description: string; activeDescription: string }
> = {
  WILDCARD: {
    title: "Wildcard",
    description: "Make unlimited squad changes this round without transfer deductions.",
    activeDescription: "Unlimited transfers with no point deduction.",
  },
  TRIPLE_CAPTAIN: {
    title: "Triple Captain",
    description: "Your saved captain will score triple points this round.",
    activeDescription: "Your captain scores triple points this round.",
  },
};

export function ChipControls({
  teamId,
  roundId,
  chips,
  editable,
  onAuthorityChange,
}: {
  teamId: string;
  roundId: string;
  chips: ChipStatus | null;
  editable: boolean;
  onAuthorityChange: () => void;
}) {
  const [confirmation, setConfirmation] = useState<
    { action: "activate"; chipType: ChipType } | { action: "remove" } | null
  >(null);
  const activateMutation = useActivateChip(teamId, roundId);
  const removeMutation = useRemoveChip(teamId, roundId);
  const { showToast } = useToast();

  async function confirmAction() {
    if (!confirmation) return;

    try {
      if (confirmation.action === "activate") {
        await activateMutation.mutateAsync(confirmation.chipType);
        showToast({
          title: `${chipDetails[confirmation.chipType].title} activated`,
          variant: "success",
        });
      } else {
        await removeMutation.mutateAsync();
        showToast({ title: "Chip removed", variant: "success" });
      }
      setConfirmation(null);
      onAuthorityChange();
    } catch (error) {
      showToast({
        title: "Chip could not be updated",
        description: getApiErrorMessage(error, "Please try again."),
        variant: "error",
      });
      onAuthorityChange();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Chips</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            One chip may be active in a round.
          </p>
        </div>
        {chips?.active ? <Badge tone="primary">Active</Badge> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {(["WILDCARD", "TRIPLE_CAPTAIN"] as ChipType[]).map((chipType) => {
          const detail = chipDetails[chipType];
          const state =
            chipType === "WILDCARD" ? chips?.wildcard : chips?.tripleCaptain;
          const active = chips?.active === chipType;
          const anotherActive = Boolean(chips?.active && !active);
          const available = Boolean(state?.available);
          const Icon = chipType === "WILDCARD" ? Sparkles : Zap;

          return (
            <div
              key={chipType}
              className="rounded-md border border-border bg-surface-muted/45 p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                <p className="font-bold">{detail.title}</p>
              </div>
              <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">
                {active
                  ? detail.activeDescription
                  : state?.usedRoundId
                    ? "Used this season."
                    : detail.description}
              </p>

              <div className="mt-3">
                {active ? (
                  editable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmation({ action: "remove" })}
                    >
                      Remove Chip
                    </Button>
                  ) : (
                    <Badge tone="primary">Active this round</Badge>
                  )
                ) : available && editable && !anotherActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfirmation({ action: "activate", chipType })
                    }
                  >
                    Activate
                  </Button>
                ) : (
                  <Badge tone="neutral">
                    {anotherActive
                      ? "Another chip active"
                      : state?.usedRoundId
                        ? "Already used"
                        : "Unavailable"}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={Boolean(confirmation)}
        title={
          confirmation?.action === "activate"
            ? `Activate ${chipDetails[confirmation.chipType].title}?`
            : "Remove active chip?"
        }
        description={
          confirmation?.action === "activate"
            ? `${chipDetails[confirmation.chipType].description} You can use this chip only once this season.`
            : "You can choose another chip while the round remains open."
        }
        confirmLabel={
          confirmation?.action === "activate"
            ? `Activate ${chipDetails[confirmation.chipType].title}`
            : "Remove Chip"
        }
        onConfirm={() => void confirmAction()}
        onClose={() => setConfirmation(null)}
        isConfirming={activateMutation.isPending || removeMutation.isPending}
      />
    </div>
  );
}
