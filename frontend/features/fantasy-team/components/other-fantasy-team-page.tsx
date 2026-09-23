"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History, LockKeyhole, Repeat2, Trophy, UserRound } from "lucide-react";
import { PageContainer, PageHeader, SectionHeader } from "@/components/layout/page";
import { Badge, ChipBadge, RoundStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { formatDeadline, formatPoints, formatRoundName } from "@/lib/format";
import {
  getLineupPlayerNameMap,
  getTeamRoundViews,
  isFantasyLineup,
} from "../history-utils";
import {
  useFantasyRules,
  useFantasyTeamProfile,
  useMyFantasyTeamForSeason,
  useRoundPerformances,
  useSeasonLeaderboard,
  useSeasonRounds,
} from "../hooks";
import { HistoricalSquad } from "./historical-squad";
import { HistoryLoading } from "./history-loading";
import { TransferPlayerList } from "./transfer-player-list";

function TeamIdentity({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
      {initials}
    </span>
  );
}

export function OtherFantasyTeamPage({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const teamQuery = useFantasyTeamProfile(teamId);
  const refetchTeam = teamQuery.refetch;
  const team = teamQuery.data?.fantasyTeam;
  const ownTeamQuery = useMyFantasyTeamForSeason(team?.season.id);
  const roundsQuery = useSeasonRounds(team?.season.id);
  const leaderboardQuery = useSeasonLeaderboard(team?.season.id);
  const rulesQuery = useFantasyRules();
  const lineups = useMemo(() => team?.lineups ?? [], [team?.lineups]);
  const roundViews = useMemo(
    () => getTeamRoundViews(roundsQuery.data?.rounds ?? [], lineups),
    [lineups, roundsQuery.data?.rounds],
  );
  const effectiveRoundId = roundViews.some(
    (view) => view.round.id === selectedRoundId,
  )
    ? selectedRoundId
    : roundViews[0]?.round.id ?? null;
  const selectedView = roundViews.find(
    (view) => view.round.id === effectiveRoundId,
  );
  const visibleLineup =
    selectedView?.lineup && isFantasyLineup(selectedView.lineup)
      ? selectedView.lineup
      : null;
  const performanceQuery = useRoundPerformances(
    visibleLineup?.round.id,
    Boolean(visibleLineup),
  );

  useEffect(() => {
    if (ownTeamQuery.data?.fantasyTeam.id === teamId) {
      router.replace("/team");
    }
  }, [ownTeamQuery.data?.fantasyTeam.id, router, teamId]);

  useEffect(() => {
    const futureDeadlines = lineups
      .filter((lineup) => !isFantasyLineup(lineup))
      .map((lineup) => new Date(lineup.round.deadline).getTime())
      .filter((deadline) => deadline > Date.now())
      .sort((left, right) => left - right);
    const nextDeadline = futureDeadlines[0];

    if (!nextDeadline) return;

    const timeout = window.setTimeout(() => {
      void refetchTeam();
    }, Math.min(nextDeadline - Date.now() + 1_000, 2_147_000_000));

    return () => window.clearTimeout(timeout);
  }, [lineups, refetchTeam]);

  if (
    teamQuery.isLoading ||
    ownTeamQuery.isLoading ||
    ownTeamQuery.data?.fantasyTeam.id === teamId
  ) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Fantasy Team" title="Team Profile" />
        <HistoryLoading />
      </PageContainer>
    );
  }

  if (
    teamQuery.error instanceof ApiError &&
    teamQuery.error.status === 404
  ) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Fantasy Team" title="Team not found" />
        <EmptyState
          title="Fantasy team not found"
          description="This team does not exist or is no longer available."
          action={
            <Button asChild variant="outline">
              <Link href="/">Return to Dashboard</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (teamQuery.isError || !team) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Fantasy Team" title="Team Profile" />
        <ErrorState
          title="Unable to load this fantasy team"
          description="Please try again in a moment."
          onRetry={() => {
            void teamQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  const leaderboardEntry = leaderboardQuery.data?.leaderboard.entries.find(
    (entry) => entry.fantasyTeamId === team.id,
  );
  const visibleLineups = lineups.filter(isFantasyLineup);
  const playerNames = getLineupPlayerNameMap(visibleLineups);
  const secondaryLoading =
    roundsQuery.isLoading ||
    rulesQuery.isLoading ||
    Boolean(visibleLineup && performanceQuery.isLoading);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Fantasy Team"
        title={team.name}
        description={`Managed by ${team.managerName} - ${team.season.name}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/leaderboard">Back to Leaderboard</Link>
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent className="grid gap-5 sm:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto_auto] lg:items-center">
          <TeamIdentity name={team.name} />
          <div>
            <p className="font-bold">{team.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {team.managerName} - {team.season.name}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">
              Total points
            </p>
            <p className="mt-1 text-2xl font-black">
              {leaderboardQuery.isLoading
                ? "-"
                : leaderboardEntry
                ? `${formatPoints(leaderboardEntry.totalPoints)} pts`
                : "Not ranked yet"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">
              Overall rank
            </p>
            <p className="mt-1 text-2xl font-black">
              {leaderboardEntry ? `#${leaderboardEntry.rank}` : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      {roundViews.length > 0 ? (
        <div className="mb-5 max-w-md">
          <Select
            label="Select round"
            value={effectiveRoundId ?? undefined}
            options={roundViews.map((view) => ({
              value: view.round.id,
              label: `${formatRoundName(view.round.roundNumber, view.round.name)}${view.lineup && !isFantasyLineup(view.lineup) ? " - Hidden" : ""}`,
            }))}
            onValueChange={setSelectedRoundId}
          />
        </div>
      ) : null}

      {secondaryLoading ? <HistoryLoading /> : null}

      {!secondaryLoading && roundViews.length === 0 ? (
        <EmptyState
          title="No lineups yet"
          description="This manager has no historical or publicly viewable fantasy lineups yet."
        />
      ) : null}

      {!secondaryLoading && selectedView?.lineup && !isFantasyLineup(selectedView.lineup) ? (
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <span className="flex size-12 items-center justify-center rounded-md bg-warning/10 text-warning">
              <LockKeyhole className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Team locked for viewing</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {team.managerName}&apos;s player selections, captain, chip and transfers will become visible after the round deadline.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <RoundStatusBadge status={selectedView.round.status} />
              <Badge tone="warning">
                Deadline {formatDeadline(selectedView.round.deadline)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!secondaryLoading && selectedView && !selectedView.lineup ? (
        <EmptyState
          title="No lineup submitted"
          description={`${team.managerName} did not save a lineup for this completed or locked round.`}
        />
      ) : null}

      {!secondaryLoading && visibleLineup && rulesQuery.data ? (
        <div className="grid gap-5">
          <Card>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-primary">Selected round</p>
                  <h2 className="mt-1 text-xl font-bold">
                    {formatRoundName(
                      visibleLineup.round.roundNumber,
                      visibleLineup.round.name,
                    )}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <RoundStatusBadge status={visibleLineup.round.status} />
                    {visibleLineup.round.status === "COMPLETED" ? (
                      <Badge tone="success">Final Results</Badge>
                    ) : (
                      <Badge tone="warning">Provisional</Badge>
                    )}
                  </div>
                </div>
                {visibleLineup.activeChip ? (
                  <ChipBadge chipType={visibleLineup.activeChip} />
                ) : (
                  <Badge>No chip</Badge>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div><Trophy className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Gross points</p><p className="mt-1 text-2xl font-black">{formatPoints(visibleLineup.grossPoints)}</p></div>
                <div><UserRound className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Final points</p><p className="mt-1 text-2xl font-black">{formatPoints(visibleLineup.roundPoints)}</p></div>
                <div><Repeat2 className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Transfers</p><p className="mt-1 text-2xl font-black">{visibleLineup.transfers.transfersMade}</p></div>
                <div><History className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Penalty</p><p className="mt-1 text-2xl font-black">{visibleLineup.transfers.transferPenalty > 0 ? `-${formatPoints(visibleLineup.transfers.transferPenalty)}` : "0"} pts</p></div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <SectionHeader
                  title="Transfer details"
                  description={`${visibleLineup.transfers.freeTransfers} free, ${visibleLineup.transfers.extraTransfers} extra`}
                />
                {visibleLineup.transfers.playersIn.length || visibleLineup.transfers.playersOut.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TransferPlayerList title="Out" ids={visibleLineup.transfers.playersOut} names={playerNames} />
                    <TransferPlayerList title="In" ids={visibleLineup.transfers.playersIn} names={playerNames} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No player changes were recorded for this round.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <HistoricalSquad
            lineup={visibleLineup}
            performances={performanceQuery.data?.performances ?? []}
            rules={rulesQuery.data.fantasyRules}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
