import Link from "next/link";
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PositionBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import { formatPoints } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";
import { getPlayerName } from "./dashboard-utils";

export function TopPerformers({
  performers,
}: {
  performers: DashboardSummary["topPerformers"];
}) {
  return (
    <Card>
      <CardContent>
        <div className="mb-5 flex items-center gap-2">
          <Flame className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-bold">Top Performers</h2>
        </div>

        {performers.length === 0 ? (
          <EmptyState
            title="No player scores yet"
            description="Top fantasy performances will appear once this round has been scored."
          />
        ) : (
          <div className="space-y-2">
            {performers.map((player, index) => (
              <Link
                key={player.playerId}
                href={`/players/${player.playerId}`}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-3 transition-colors hover:border-primary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {getPlayerName(player)}
                  </span>
                  <span className="mt-1 block">
                    <PositionBadge position={player.position} />
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm font-black">
                  {formatPoints(player.fantasyPoints)} pts
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
