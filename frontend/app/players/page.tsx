import { Suspense } from "react";
import { LoadingState } from "@/components/ui/state";
import { PlayersDirectoryPage } from "@/features/players/components/players-directory-page";

export default function PlayersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading players" />}>
      <PlayersDirectoryPage />
    </Suspense>
  );
}
