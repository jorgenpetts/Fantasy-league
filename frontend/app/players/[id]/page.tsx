import { PlayerProfilePage } from "@/features/players/components/player-profile-page";

export default async function PlayerDetailPage({
  params,
}: PageProps<"/players/[id]">) {
  const { id } = await params;

  return <PlayerProfilePage playerId={id} />;
}
