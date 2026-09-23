import { CalendarClock, Lock, PencilLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, RoundStatusBadge } from "@/components/ui/badge";
import { formatDeadline, formatRoundName } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";

export function CurrentRoundCard({
  round,
}: {
  round: DashboardSummary["currentRound"];
}) {
  if (!round) {
    return (
      <Card>
        <CardContent>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Current Round
          </p>
          <h2 className="mt-2 text-2xl font-bold">No active fantasy round</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The next fantasy round has not been scheduled yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Round {round.roundNumber}
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {formatRoundName(round.roundNumber, round.name)}
            </h2>
          </div>
          <RoundStatusBadge status={round.status} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-surface-muted p-4">
            <CalendarClock className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              Deadline
            </p>
            <p className="mt-1 text-base font-bold">
              {formatDeadline(round.deadline)}
            </p>
          </div>
          <div className="rounded-card border border-border bg-surface-muted p-4">
            {round.canEdit ? (
              <PencilLine className="size-5 text-success" aria-hidden="true" />
            ) : (
              <Lock className="size-5 text-warning" aria-hidden="true" />
            )}
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              Team Status
            </p>
            <div className="mt-2">
              <Badge tone={round.canEdit ? "success" : "warning"}>
                {round.canEdit ? "Changes open" : "Team locked"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
