"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Medal, Trophy, UserRound } from "lucide-react";
import { Badge, RoundStatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/state";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { useFantasyTeamStatus } from "@/features/fantasy-team/hooks";
import { ApiError } from "@/lib/api";
import { formatPoints, formatRoundName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry, Round } from "@/types/api";
import {
  useLeaderboard,
  useLeaderboardRounds,
  useLeaderboardSeason,
} from "../hooks";
import {
  getDefaultLeaderboardRound,
  getLeaderboardTeamHref,
} from "../utils";

function LeaderboardLoading() {
  return (
    <div className="space-y-5" aria-label="Loading leaderboard">
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Card>
        <CardHeader><Skeleton className="h-7 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ModeSelector({
  mode,
  roundHref,
}: {
  mode: "overall" | "round";
  roundHref: string;
}) {
  return (
    <nav
      aria-label="Leaderboard mode"
      className="inline-grid grid-cols-2 rounded-md border border-border bg-surface p-1"
    >
      <Link
        href="/leaderboard"
        aria-current={mode === "overall" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: mode === "overall" ? "primary" : "ghost", size: "sm" }),
          "border-transparent",
        )}
      >
        Overall
      </Link>
      <Link
        href={roundHref}
        aria-current={mode === "round" ? "page" : undefined}
        className={cn(
          buttonVariants({ variant: mode === "round" ? "primary" : "ghost", size: "sm" }),
          "border-transparent",
        )}
      >
        Round
      </Link>
    </nav>
  );
}

function CurrentUserSummary({
  entry,
  hasTeam,
  mode,
}: {
  entry?: LeaderboardEntry;
  hasTeam: boolean;
  mode: "overall" | "round";
}) {
  if (!hasTeam) {
    return (
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">You have not joined the competition yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your fantasy team to appear in the standings.
            </p>
          </div>
          <Button asChild><Link href="/team">Create Team</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <UserRound className="size-5 text-primary" aria-hidden="true" />
          <h2 className="font-bold">Your Position</h2>
        </div>
        {entry ? (
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:max-w-lg sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">
                {mode === "round" ? "Round rank" : "Overall rank"}
              </dt>
              <dd className="mt-1 text-2xl font-black">#{entry.rank}</dd>
            </div>
            {mode === "round" ? (
              <div>
                <dt className="text-xs font-bold uppercase text-muted-foreground">Round points</dt>
                <dd className="mt-1 text-2xl font-black">{formatPoints(entry.roundPoints ?? 0)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">Total points</dt>
              <dd className="mt-1 text-2xl font-black">{formatPoints(entry.totalPoints)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "round"
              ? "Your team does not have a score for this round."
              : "Your team is not ranked yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RankMark({ rank }: { rank: number }) {
  const tone = rank === 1 ? "primary" : rank <= 3 ? "accent" : "neutral";

  return <Badge tone={tone}>#{rank}</Badge>;
}

function LeaderboardRows({
  entries,
  currentTeamId,
  mode,
}: {
  entries: LeaderboardEntry[];
  currentTeamId?: string;
  mode: "overall" | "round";
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-border lg:block">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-24 px-4 py-3" scope="col">Rank</th>
              <th className="px-4 py-3" scope="col">Fantasy Team</th>
              <th className="px-4 py-3" scope="col">Manager</th>
              {mode === "round" ? <th className="px-4 py-3 text-right" scope="col">Round Points</th> : null}
              <th className="px-4 py-3 text-right" scope="col">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => {
              const isCurrentTeam = entry.fantasyTeamId === currentTeamId;
              return (
                <tr key={entry.fantasyTeamId} className={cn(isCurrentTeam && "bg-primary/5")}>
                  <td className="px-4 py-4"><RankMark rank={entry.rank} /></td>
                  <td className="px-4 py-4">
                    <Link
                      href={getLeaderboardTeamHref(entry.fantasyTeamId, currentTeamId)}
                      className="font-bold hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {entry.fantasyTeamName}
                    </Link>
                    {isCurrentTeam ? <Badge className="ml-2" tone="primary">You</Badge> : null}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{entry.managerName}</td>
                  {mode === "round" ? (
                    <td className="px-4 py-4 text-right font-black">{formatPoints(entry.roundPoints ?? 0)} pts</td>
                  ) : null}
                  <td className="px-4 py-4 text-right font-black">{formatPoints(entry.totalPoints)} pts</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ol className="space-y-2 lg:hidden">
        {entries.map((entry) => {
          const isCurrentTeam = entry.fantasyTeamId === currentTeamId;
          return (
            <li key={entry.fantasyTeamId}>
              <Link
                href={getLeaderboardTeamHref(entry.fantasyTeamId, currentTeamId)}
                className={cn(
                  "grid min-h-20 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-md border border-border p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isCurrentTeam ? "border-primary/30 bg-primary/5" : "bg-surface hover:border-primary/40",
                )}
              >
                <RankMark rank={entry.rank} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{entry.fantasyTeamName}</span>
                    {isCurrentTeam ? <Badge tone="primary">You</Badge> : null}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{entry.managerName}</span>
                </span>
                <span className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {mode === "round" ? (
                    <span className="block font-black">{formatPoints(entry.roundPoints ?? 0)} pts</span>
                  ) : null}
                  <span className={cn("block", mode === "round" ? "text-xs text-muted-foreground" : "font-black")}>
                    {formatPoints(entry.totalPoints)}{mode === "round" ? " total" : " pts"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function RoundContext({ round }: { round: Round }) {
  const message =
    round.status === "COMPLETED"
      ? "Final results"
      : round.status === "LOCKED" || round.isLocked
        ? "Scores may still change while results are being entered."
        : "Results are not available yet.";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold">{formatRoundName(round.roundNumber, round.name)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <RoundStatusBadge status={round.status} />
    </div>
  );
}

export function LeaderboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRoundId = searchParams.get("roundId") ?? undefined;
  const mode = requestedRoundId ? "round" : "overall";
  const seasonQuery = useLeaderboardSeason();
  const season = seasonQuery.data?.season;
  const roundsQuery = useLeaderboardRounds(season?.id);
  const rounds = roundsQuery.data?.rounds ?? [];
  const defaultRound = getDefaultLeaderboardRound(rounds);
  const selectedRound = requestedRoundId
    ? rounds.find((round) => round.id === requestedRoundId)
    : undefined;
  const roundSelectionReady = mode === "overall" || Boolean(selectedRound);
  const leaderboardQuery = useLeaderboard({
    seasonId: season?.id,
    roundId: selectedRound?.id,
    enabled: roundSelectionReady,
  });
  const teamStatusQuery = useFantasyTeamStatus();
  const currentTeamId = teamStatusQuery.data?.fantasyTeam?.id;
  const entries = leaderboardQuery.data?.leaderboard.entries ?? [];
  const currentEntry = entries.find((entry) => entry.fantasyTeamId === currentTeamId);
  const roundHref = defaultRound ? `/leaderboard?roundId=${defaultRound.id}` : "/leaderboard";
  const noActiveSeason = seasonQuery.error instanceof ApiError && seasonQuery.error.status === 404;

  if (seasonQuery.isLoading) {
    return <PageContainer><LeaderboardLoading /></PageContainer>;
  }

  if (noActiveSeason) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Competition" title="Fantasy Leaderboard" description="See how you stack up against the rest of the league." />
        <EmptyState title="No active season" description="Standings will appear when the next fantasy season begins." />
      </PageContainer>
    );
  }

  if (seasonQuery.isError) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Competition" title="Fantasy Leaderboard" />
        <ErrorState title="Unable to load the leaderboard" description="We could not load the active fantasy season." onRetry={() => void seasonQuery.refetch()} />
      </PageContainer>
    );
  }

  const roundsLoading = mode === "round" && roundsQuery.isLoading;
  const invalidRound =
    mode === "round" && !roundsLoading && !roundsQuery.isError && !selectedRound;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={season?.name ?? "Competition"}
        title="Fantasy Leaderboard"
        description="See how you stack up against the rest of the league."
        actions={<ModeSelector mode={mode} roundHref={roundHref} />}
      />

      {mode === "round" ? (
        <div className="mb-5 max-w-sm">
          <Select
            label="Select Round"
            value={selectedRound?.id ?? ""}
            placeholder={roundsLoading ? "Loading rounds..." : "Select a round"}
            disabled={roundsLoading || rounds.length === 0}
            options={[...rounds]
              .sort((a, b) => a.roundNumber - b.roundNumber)
              .map((round) => ({ value: round.id, label: formatRoundName(round.roundNumber, round.name) }))}
            onValueChange={(roundId) => router.push(`/leaderboard?roundId=${roundId}`)}
          />
        </div>
      ) : null}

      {mode === "round" && roundsQuery.isError ? (
        <ErrorState
          title="Unable to load fantasy rounds"
          description="The available rounds could not be retrieved."
          onRetry={() => void roundsQuery.refetch()}
        />
      ) : invalidRound ? (
        <EmptyState
          title="Round not found"
          description="This round is not part of the active fantasy season."
          action={defaultRound ? (
            <Button asChild variant="outline"><Link href={roundHref}>View latest round</Link></Button>
          ) : (
            <Button asChild variant="outline"><Link href="/leaderboard">View overall standings</Link></Button>
          )}
        />
      ) : roundsLoading || leaderboardQuery.isLoading || teamStatusQuery.isLoading ? (
        <LeaderboardLoading />
      ) : leaderboardQuery.isError ? (
        <ErrorState title="Unable to load the leaderboard" description="The latest standings could not be retrieved." onRetry={() => void leaderboardQuery.refetch()} />
      ) : (
        <div className="space-y-5">
          {selectedRound ? <RoundContext round={selectedRound} /> : null}

          <CurrentUserSummary entry={currentEntry} hasTeam={Boolean(currentTeamId)} mode={mode} />

          {entries.length === 0 ? (
            <EmptyState
              title={mode === "round" ? "No scores available for this round yet" : "No fantasy teams yet"}
              description={
                mode === "round"
                  ? selectedRound?.status === "UPCOMING"
                    ? "Results will appear once this round has been scored."
                    : "No submitted lineups have a score for this round."
                  : "The leaderboard will appear once managers join the competition."
              }
            />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {mode === "overall" ? <Trophy className="size-5 text-primary" aria-hidden="true" /> : <Medal className="size-5 text-primary" aria-hidden="true" />}
                  <h2 className="font-bold">{mode === "overall" ? "Overall Standings" : "Round Standings"}</h2>
                </div>
                <span className="text-sm text-muted-foreground">{entries.length} {entries.length === 1 ? "team" : "teams"}</span>
              </CardHeader>
              <CardContent>
                <LeaderboardRows entries={entries} currentTeamId={currentTeamId} mode={mode} />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button asChild variant="ghost">
              <Link href="/team">My Team <ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
