import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/state";

export function DashboardLoading() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardContent>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-10 w-44" />
            <Skeleton className="mt-6 h-16 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
