"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleDollarSign, Repeat2, Sparkles, Trophy } from "lucide-react";
import { PageContainer, PageHeader, SectionHeader } from "@/components/layout/page";
import { Badge, ChipBadge, RoundStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { Select } from "@/components/ui/select";
import { formatPlayerPrice, formatPoints, formatRoundName } from "@/lib/format";
import {
  getHistoricalLineups,
  getLineupPlayerNameMap,
  getPerformancePointsByPlayer,
  isFantasyLineup,
} from "../history-utils";
import {
  useFantasyRules,
  useFantasyTeamLineups,
  useFantasyTeamStatus,
  useRoundPerformances,
} from "../hooks";
import { getPlayerName } from "../utils";
import { HistoricalSquad } from "./historical-squad";
import { HistoryLoading } from "./history-loading";
import { TeamHistoryNav } from "./team-history-nav";
import { TransferPlayerList } from "./transfer-player-list";

export function HistoricalLineupPage({ roundId }: { roundId: string }) {
  const router = useRouter();
  const statusQuery = useFantasyTeamStatus();
  const teamId = statusQuery.data?.fantasyTeam?.id;
  const lineupsQuery = useFantasyTeamLineups(teamId);
  const visibleLineups = (lineupsQuery.data?.lineups ?? []).filter(isFantasyLineup);
  const lineup = visibleLineups.find((item) => item.round.id === roundId);
  const historicalLineups = getHistoricalLineups(lineupsQuery.data?.lineups ?? []);
  const performanceQuery = useRoundPerformances(
    roundId,
    Boolean(lineup && !lineup.round.canEdit),
  );
  const rulesQuery = useFantasyRules();

  useEffect(() => {
    if (lineup?.round.canEdit) router.replace("/team");
  }, [lineup, router]);

  const isLoading =
    statusQuery.isLoading ||
    Boolean(teamId && lineupsQuery.isLoading) ||
    rulesQuery.isLoading ||
    Boolean(lineup && !lineup.round.canEdit && performanceQuery.isLoading);
  const hasError =
    statusQuery.isError ||
    lineupsQuery.isError ||
    rulesQuery.isError ||
    performanceQuery.isError;

  if (isLoading || lineup?.round.canEdit) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title="Round History" />
        <TeamHistoryNav />
        <HistoryLoading />
      </PageContainer>
    );
  }

  if (hasError) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title="Round History" />
        <TeamHistoryNav />
        <ErrorState
          title="Unable to load this historical lineup"
          description="Please try again in a moment."
          onRetry={() => {
            void statusQuery.refetch();
            void lineupsQuery.refetch();
            void performanceQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  if (!statusQuery.data?.fantasyTeam) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title="Round History" />
        <TeamHistoryNav />
        <EmptyState
          title="No fantasy team found"
          description="Create a fantasy team before viewing round history."
          action={<Button asChild><Link href="/team">Create Team</Link></Button>}
        />
      </PageContainer>
    );
  }

  if (!lineup || !rulesQuery.data) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title="Historical round not found" />
        <TeamHistoryNav />
        <EmptyState
          title="Lineup not found"
          description="This round does not belong to your current fantasy-team history."
          action={<Button asChild variant="outline"><Link href="/team/history">View Round History</Link></Button>}
        />
      </PageContainer>
    );
  }

  const performances = performanceQuery.data?.performances ?? [];
  const pointsByPlayer = getPerformancePointsByPlayer(performances);
  const captain = lineup.players.find((player) => player.id === lineup.captainId);
  const captainPoints = pointsByPlayer.get(lineup.captainId) ?? 0;
  const multiplier = lineup.activeChip === "TRIPLE_CAPTAIN"
    ? rulesQuery.data.fantasyRules.scoring.tripleCaptainMultiplier
    : rulesQuery.data.fantasyRules.scoring.captainMultiplier;
  const basePoints = lineup.players.reduce(
    (total, player) => total + (pointsByPlayer.get(player.id) ?? 0),
    0,
  );
  const captainBonus = captainPoints * (multiplier - 1);
  const playerNames = getLineupPlayerNameMap(visibleLineups);
  const currentIndex = historicalLineups.findIndex((item) => item.id === lineup.id);
  const newerLineup = currentIndex > 0 ? historicalLineups[currentIndex - 1] : null;
  const olderLineup = currentIndex >= 0 ? historicalLineups[currentIndex + 1] : null;
  const isCompleted = lineup.round.status === "COMPLETED";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Round History"
        title={formatRoundName(lineup.round.roundNumber, lineup.round.name)}
        description={`${lineup.fantasyTeam.name} - ${isCompleted ? "Final results" : "Team locked, results pending"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <RoundStatusBadge status={lineup.round.status} />
            <Badge tone={isCompleted ? "success" : "warning"}>
              {isCompleted ? "Final Results" : "Provisional"}
            </Badge>
          </div>
        }
      />
      <TeamHistoryNav />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Select
          label="Select round"
          value={lineup.round.id}
          options={historicalLineups.map((item) => ({
            value: item.round.id,
            label: formatRoundName(item.round.roundNumber, item.round.name),
          }))}
          onValueChange={(value) => router.push(`/team/history/${value}`)}
        />
        <Button asChild={Boolean(olderLineup)} variant="outline" disabled={!olderLineup}>
          {olderLineup ? (
            <Link href={`/team/history/${olderLineup.round.id}`}>
              <ArrowLeft aria-hidden="true" /> Older
            </Link>
          ) : (
            <span><ArrowLeft aria-hidden="true" /> Older</span>
          )}
        </Button>
        <Button asChild={Boolean(newerLineup)} variant="outline" disabled={!newerLineup}>
          {newerLineup ? (
            <Link href={`/team/history/${newerLineup.round.id}`}>
              Newer <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <span>Newer <ArrowRight aria-hidden="true" /></span>
          )}
        </Button>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent><p className="text-xs font-bold uppercase text-muted-foreground">Final round points</p><p className="mt-2 text-3xl font-black">{formatPoints(lineup.roundPoints)}</p></CardContent></Card>
          <Card><CardContent><p className="text-xs font-bold uppercase text-muted-foreground">Gross points</p><p className="mt-2 text-3xl font-black">{formatPoints(lineup.grossPoints)}</p></CardContent></Card>
          <Card><CardContent><p className="text-xs font-bold uppercase text-muted-foreground">Captain</p><p className="mt-2 font-bold">{captain ? getPlayerName(captain) : "Unavailable"}</p><p className="mt-1 text-sm text-muted-foreground">{multiplier}x contribution</p></CardContent></Card>
          <Card><CardContent><p className="text-xs font-bold uppercase text-muted-foreground">Chip</p><div className="mt-2">{lineup.activeChip ? <ChipBadge chipType={lineup.activeChip} /> : <span className="font-bold">No chip</span>}</div></CardContent></Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardContent>
              <SectionHeader title="Points breakdown" />
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Player points</dt><dd className="font-bold">{formatPoints(basePoints)} pts</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Captain bonus</dt><dd className="font-bold text-success">+{formatPoints(captainBonus)} pts</dd></div>
                <div className="flex justify-between gap-4 border-t border-border pt-3"><dt className="font-semibold">Backend gross points</dt><dd className="font-black">{formatPoints(lineup.grossPoints)} pts</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Transfer penalty</dt><dd className={lineup.transfers.transferPenalty ? "font-bold text-danger" : "font-bold"}>{lineup.transfers.transferPenalty ? `-${formatPoints(lineup.transfers.transferPenalty)}` : "0"} pts</dd></div>
                <div className="flex justify-between gap-4 border-t border-border pt-3 text-base"><dt className="font-bold">Final round points</dt><dd className="font-black">{formatPoints(lineup.roundPoints)} pts</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <SectionHeader title="Transfers and chip" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Repeat2 className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Transfers</p><p className="mt-1 text-xl font-black">{lineup.transfers.transfersMade}</p></div>
                <div><Trophy className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Free transfers</p><p className="mt-1 text-xl font-black">{lineup.transfers.freeTransfers}</p></div>
                <div><Sparkles className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Extra transfers</p><p className="mt-1 text-xl font-black">{lineup.transfers.extraTransfers}</p></div>
                <div><CircleDollarSign className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs font-bold uppercase text-muted-foreground">Penalty</p><p className="mt-1 text-xl font-black">{lineup.transfers.transferPenalty > 0 ? `-${formatPoints(lineup.transfers.transferPenalty)}` : "0"} pts</p></div>
              </div>
              {lineup.activeChip === "WILDCARD" ? <p className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm"><strong>Wildcard used.</strong> Unlimited transfers applied with no transfer penalty.</p> : null}
              {lineup.activeChip === "TRIPLE_CAPTAIN" ? <p className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm"><strong>Triple Captain used.</strong> The saved captain contributes 3x points.</p> : null}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TransferPlayerList title="Out" ids={lineup.transfers.playersOut} names={playerNames} />
                <TransferPlayerList title="In" ids={lineup.transfers.playersIn} names={playerNames} />
              </div>
            </CardContent>
          </Card>
        </div>

        <HistoricalSquad lineup={lineup} performances={performances} rules={rulesQuery.data.fantasyRules} />

        <Card>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">Squad value using current player prices</p>
              <p className="text-sm text-muted-foreground">Player prices were not snapshotted for this round, so this is not a historical valuation.</p>
            </div>
            <p className="text-xl font-black">{formatPlayerPrice(lineup.squadValue)}</p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
