import { OtherFantasyTeamPage } from "@/features/fantasy-team/components/other-fantasy-team-page";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OtherFantasyTeamPage teamId={id} />;
}
