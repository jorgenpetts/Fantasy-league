import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page";
import { Skeleton } from "@/components/ui/state";
import { LeaderboardPage as LeaderboardFeaturePage } from "@/features/leaderboard/components/leaderboard-page";

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<PageContainer><Skeleton className="h-[32rem] w-full" /></PageContainer>}>
      <LeaderboardFeaturePage />
    </Suspense>
  );
}
