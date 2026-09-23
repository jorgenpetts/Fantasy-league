import Link from "next/link";
import { ArrowRight, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";

export function LeaderboardPreview({
  entries,
  currentTeamId,
}: {
  entries: DashboardSummary["leaderboardPreview"];
  currentTeamId?: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-bold">League Leaders</h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/leaderboard">
              <ArrowRight aria-hidden="true" />
              View Full Leaderboard
            </Link>
          </Button>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="No leaderboard yet"
            description="Standings will appear once teams have scored points."
          />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isCurrentTeam = entry.fantasyTeamId === currentTeamId;

              return (
                <Link
                  key={entry.fantasyTeamId}
                  href={isCurrentTeam ? "/team" : `/team/${entry.fantasyTeamId}`}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isCurrentTeam
                      ? "border-primary/30 bg-primary/10"
                      : "border-border bg-surface-muted hover:border-primary/40 hover:bg-background",
                  )}
                >
                  <span className="text-sm font-black">#{entry.rank}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">
                      {entry.fantasyTeamName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {isCurrentTeam ? "You" : entry.managerName}
                    </span>
                  </span>
                  <span className="text-right text-sm font-black">
                    {formatPoints(entry.totalPoints)} pts
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
