"use client";

import Link from "next/link";
import { History, PlusCircle } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/ui/state";
import { useAuth } from "@/hooks/use-auth";
import { formatRoundName } from "@/lib/format";
import { useDashboard } from "../hooks";
import { CurrentRoundCard } from "./current-round-card";
import { DashboardLoading } from "./dashboard-loading";
import { LeaderboardPreview } from "./leaderboard-preview";
import { ScoreSummary } from "./score-summary";
import { SquadPreview } from "./squad-preview";
import { TopPerformers } from "./top-performers";
import { TransfersChipsCard } from "./transfers-chips-card";

export function DashboardPage() {
  const { user } = useAuth();
  const dashboardQuery = useDashboard();
  const dashboard = dashboardQuery.data?.dashboard;
  const roundName = dashboard?.currentRound
    ? formatRoundName(
        dashboard.currentRound.roundNumber,
        dashboard.currentRound.name,
      )
    : "Season overview";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dashboard"
        title={user ? `Welcome back, ${user.name}` : "Fantasy Dashboard"}
        description={roundName}
        actions={
          dashboard?.fantasyTeam ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/team/history">
                  <History aria-hidden="true" />
                  Round History
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/team">Open My Team</Link>
              </Button>
            </>
          ) : null
        }
      />

      {dashboardQuery.isLoading ? <DashboardLoading /> : null}

      {dashboardQuery.isError ? (
        <ErrorState
          title="Unable to load your fantasy dashboard"
          description="Please try again in a moment."
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : null}

      {dashboard && !dashboardQuery.isLoading && !dashboardQuery.isError ? (
        dashboard.season ? (
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <CurrentRoundCard round={dashboard.currentRound} />
              <ScoreSummary
                roundPoints={dashboard.roundPoints}
                totalPoints={dashboard.totalPoints}
                overallRank={dashboard.overallRank}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
              <SquadPreview dashboard={dashboard} />
              <TransfersChipsCard dashboard={dashboard} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <TopPerformers performers={dashboard.topPerformers} />
              <LeaderboardPreview
                entries={dashboard.leaderboardPreview}
                currentTeamId={dashboard.fantasyTeam?.id}
              />
            </div>
          </div>
        ) : (
          <EmptyState
            title="No active season yet"
            description="Your fantasy dashboard will appear once a season has been activated."
            action={
              <Button asChild>
                <Link href="/team">
                  <PlusCircle aria-hidden="true" />
                  Prepare Team
                </Link>
              </Button>
            }
          />
        )
      ) : null}
    </PageContainer>
  );
}
