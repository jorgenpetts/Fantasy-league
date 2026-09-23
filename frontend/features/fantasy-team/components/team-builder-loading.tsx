import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/state";

export function TeamBuilderLoading() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-5 w-36" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="hidden xl:block">
        <CardContent className="space-y-3">
          <Skeleton className="h-10" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
