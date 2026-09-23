import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/state";

export function HistoryLoading() {
  return (
    <div className="grid gap-4" aria-label="Loading round history">
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
