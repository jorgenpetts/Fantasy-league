import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <Card className="flex min-h-40 items-center justify-center p-6 text-muted-foreground">
      <Loader2 className="mr-2 size-5 animate-spin" />
      <span className="text-sm font-medium">{label}</span>
    </Card>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border/70 ${className}`} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <Inbox className="size-9 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="size-9 text-danger" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <Button className="mt-5" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Card>
  );
}
