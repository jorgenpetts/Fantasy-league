import { HistoricalLineupPage } from "@/features/fantasy-team/components/historical-lineup-page";

export default async function HistoricalRoundPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;

  return <HistoricalLineupPage roundId={roundId} />;
}
