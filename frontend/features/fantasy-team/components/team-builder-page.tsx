"use client";

import { CalendarX2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { Badge } from "@/components/ui/badge";
import { formatDeadline } from "@/lib/format";
import {
  useCurrentSeason,
  useFantasyRules,
  useFantasyTeamStatus,
  useTeamBuilderLineup,
} from "../hooks";
import { getDraftSignature } from "../utils";
import { TeamBuilder } from "./team-builder";
import { TeamBuilderLoading } from "./team-builder-loading";
import { TeamCreation } from "./team-creation";
import { TeamHistoryNav } from "./team-history-nav";

export function TeamBuilderPage() {
  const statusQuery = useFantasyTeamStatus();
  const rulesQuery = useFantasyRules();
  const status = statusQuery.data;
  const seasonQuery = useCurrentSeason(
    statusQuery.isSuccess && !status?.fantasyTeam,
  );
  const lineupQuery = useTeamBuilderLineup(status);
  const rules = rulesQuery.data?.fantasyRules;

  function refreshAuthority() {
    void Promise.all([statusQuery.refetch(), lineupQuery.refetch()]);
  }

  if (statusQuery.isLoading || rulesQuery.isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title="Team Builder" />
        <TeamBuilderLoading />
      </PageContainer>
    );
  }

  if (statusQuery.isError || rulesQuery.isError || !status || !rules) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title="Team Builder" />
        <ErrorState
          title="Unable to load your fantasy team"
          description="Please try again in a moment."
          onRetry={() => {
            void statusQuery.refetch();
            void rulesQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  if (!status.fantasyTeam) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="My Team"
          title="Create Your Team"
          description="Choose a name, then select your 11-player fantasy squad."
        />
        {seasonQuery.isLoading ? <TeamBuilderLoading /> : null}
        {seasonQuery.isError ? (
          <EmptyState
            title="No active season"
            description="A fantasy team can be created once an active season is available."
          />
        ) : null}
        {seasonQuery.data?.season ? (
          <TeamCreation season={seasonQuery.data.season} />
        ) : null}
      </PageContainer>
    );
  }

  if (!status.round) {
    return (
      <PageContainer>
      <PageHeader
        eyebrow="My Team"
        title={status.fantasyTeam.name}
        description="Your fantasy squad"
      />
      <TeamHistoryNav />
      <EmptyState
          title="No active fantasy round"
          description="There is no round available to view or edit yet."
          action={<CalendarX2 className="size-5 text-muted-foreground" />}
        />
      </PageContainer>
    );
  }

  if (lineupQuery.isLoading) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title={status.fantasyTeam.name} />
        <TeamBuilderLoading />
      </PageContainer>
    );
  }

  if (lineupQuery.isError || !lineupQuery.data) {
    return (
      <PageContainer>
        <PageHeader eyebrow="My Team" title={status.fantasyTeam.name} />
        <ErrorState
          title="Unable to load your current squad"
          description="The round may have changed. Refresh the team data and try again."
          onRetry={refreshAuthority}
        />
      </PageContainer>
    );
  }

  const sourceLineup = lineupQuery.data.lineup ?? lineupQuery.data.suggestedLineup;
  const editorKey = [
    status.round.id,
    lineupQuery.data.lineup?.id ?? "suggested",
    sourceLineup
      ? getDraftSignature(
          sourceLineup.players.map((player) => player.id),
          sourceLineup.captainId,
        )
      : "empty",
  ].join(":");

  return (
    <PageContainer>
      <PageHeader
        eyebrow="My Team"
        title={status.fantasyTeam.name}
        description={`Deadline ${formatDeadline(status.round.deadline)}`}
        actions={
          <Badge tone={status.round.canEdit ? "success" : "warning"}>
            {status.round.canEdit ? "Team changes open" : "Read only"}
          </Badge>
        }
      />
      <TeamHistoryNav />
      <TeamBuilder
        key={editorKey}
        status={status}
        lineupState={lineupQuery.data}
        rules={rules}
        onAuthorityChange={refreshAuthority}
      />
    </PageContainer>
  );
}
