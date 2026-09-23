import { CalendarClock, CircleDollarSign, Repeat2, Users } from "lucide-react";
import { Badge, RoundStatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDeadline, formatPlayerPrice, formatRoundName } from "@/lib/format";
import type { FantasyTeamStatus } from "@/types/api";

type TransferSummary = FantasyTeamStatus["transfers"];

export function TeamSummary({
  status,
  selectedCount,
  squadSize,
  squadValue,
  budget,
  transfers,
  projected,
  isDirty,
}: {
  status: FantasyTeamStatus;
  selectedCount: number;
  squadSize: number;
  squadValue: number;
  budget: number;
  transfers: TransferSummary;
  projected: TransferSummary;
  isDirty: boolean;
}) {
  const round = status.round!;
  const displayedTransfers = isDirty ? projected : transfers;
  const remaining = budget - squadValue;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden="true" />
              Current round
            </div>
            <p className="mt-2 truncate font-black">
              {formatRoundName(round.roundNumber, round.name)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RoundStatusBadge status={round.status} />
              <Badge tone={round.canEdit ? "success" : "warning"}>
                {round.canEdit ? "Changes open" : "Team locked"}
              </Badge>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <Users className="size-4" aria-hidden="true" />
              Squad
            </div>
            <p className="mt-2 text-xl font-black">
              {selectedCount} / {squadSize}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedCount === squadSize ? "All slots filled" : "Players selected"}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <CircleDollarSign className="size-4" aria-hidden="true" />
              Remaining
            </div>
            <p className={`mt-2 text-xl font-black ${remaining < 0 ? "text-danger" : ""}`}>
              {remaining < 0 ? "-" : ""}{formatPlayerPrice(Math.abs(remaining))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPlayerPrice(squadValue)} of {formatPlayerPrice(budget)}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
              <Repeat2 className="size-4" aria-hidden="true" />
              {isDirty ? "Projected transfers" : "Transfers"}
            </div>
            <p className="mt-2 text-xl font-black">
              {displayedTransfers.transfersMade}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {displayedTransfers.transferPenalty > 0
                ? `-${displayedTransfers.transferPenalty} pts`
                : `${displayedTransfers.freeTransfers} free, no deduction`}
            </p>
          </div>
        </CardContent>
      </Card>

      {!round.canEdit ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-bold">{formatRoundName(round.roundNumber, round.name)} is locked.</p>
          <p className="mt-1 text-muted-foreground">
            Your team can no longer be changed. Deadline: {formatDeadline(round.deadline)}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
