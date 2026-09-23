import { Shuffle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPlayerPrice, formatPoints } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";
import { getChipState } from "./dashboard-utils";

function ChipStatusRow({
  label,
  state,
}: {
  label: string;
  state: string;
}) {
  const tone =
    state === "Active this round"
      ? "primary"
      : state === "Available"
        ? "success"
        : "neutral";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge tone={tone}>{state}</Badge>
    </div>
  );
}

export function TransfersChipsCard({
  dashboard,
}: {
  dashboard: DashboardSummary;
}) {
  const { transfers, squad, chips, currentRound } = dashboard;

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2">
          <Shuffle className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-bold">Transfers & Chips</h2>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-card border border-border bg-surface-muted p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Free Transfers
            </p>
            <p className="mt-1 text-2xl font-black">
              {transfers.transfersMade} / {transfers.freeTransfers}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Extra transfers: {transfers.extraTransfers}
            </p>
          </div>

          <div className="rounded-card border border-border bg-surface-muted p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Transfer Penalty
            </p>
            <p className="mt-1 text-2xl font-black">
              {transfers.transferPenalty > 0
                ? `-${formatPoints(transfers.transferPenalty)} pts`
                : "0 pts"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applied by the backend
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-card border border-border bg-surface-muted p-4">
          <p className="text-sm font-medium text-muted-foreground">Squad Value</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <p className="text-2xl font-black">{formatPlayerPrice(squad.value)}</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {formatPlayerPrice(squad.remainingBudget)} remaining
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(100, Math.max(0, (squad.value / squad.budget) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Budget {formatPlayerPrice(squad.budget)}
          </p>
        </div>

        <div className="mt-5 rounded-card border border-border bg-surface-muted p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-bold">Chip Status</p>
          </div>
          <div className="space-y-3">
            <ChipStatusRow
              label="Wildcard"
              state={getChipState("WILDCARD", chips, currentRound?.id)}
            />
            <ChipStatusRow
              label="Triple Captain"
              state={getChipState("TRIPLE_CAPTAIN", chips, currentRound?.id)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
