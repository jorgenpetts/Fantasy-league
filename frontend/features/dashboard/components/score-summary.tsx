import { Activity, Medal, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/format";

type ScoreSummaryProps = {
  roundPoints: number;
  totalPoints: number;
  overallRank: number | null;
};

const statClasses =
  "rounded-card border border-border bg-surface p-4 shadow-sm";

export function ScoreSummary({
  roundPoints,
  totalPoints,
  overallRank,
}: ScoreSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-4">
          <Activity className="size-5 opacity-85" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium opacity-80">Round Points</p>
          <p className="mt-1 text-3xl font-black">
            {formatPoints(roundPoints)} pts
          </p>
        </CardContent>
      </Card>

      <div className={statClasses}>
        <Trophy className="size-5 text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Total Points
        </p>
        <p className="mt-1 text-2xl font-black">
          {formatPoints(totalPoints)} pts
        </p>
      </div>

      <div className={statClasses}>
        <Medal className="size-5 text-primary" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Overall Rank
        </p>
        <p className="mt-1 text-2xl font-black">
          {overallRank ? `#${overallRank}` : "Not ranked"}
        </p>
      </div>
    </div>
  );
}
