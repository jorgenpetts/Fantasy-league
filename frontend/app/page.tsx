import { Activity, CalendarClock, Trophy } from "lucide-react";
import { PageContainer, PageHeader, SectionHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/state";

export default function Home() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Home"
        title="Fantasy dashboard"
        description="The shell is ready for live dashboard data, current-round status, squad summaries, and leaderboard previews."
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardContent>
            <SectionHeader
              title="Current round"
              description="Dashboard cards will be connected in the next frontend slice."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Round points", icon: Activity },
                { label: "Total points", icon: Trophy },
                { label: "Deadline", icon: CalendarClock },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-card border border-border bg-surface-muted p-4"
                >
                  <item.icon className="size-5 text-primary" aria-hidden="true" />
                  <p className="mt-4 text-sm text-muted-foreground">{item.label}</p>
                  <Skeleton className="mt-2 h-7 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <EmptyState
          title="Feature pages are staged"
          description="Navigation, UI components, API services, query provider, and route placeholders are ready for the next build step."
        />
      </div>
    </PageContainer>
  );
}
