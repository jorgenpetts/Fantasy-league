import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { ChipType, PlayerPosition, RoundStatus } from "@/types/api";
import { playerPositionLabels, roundStatusLabels } from "@/lib/format";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "accent";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-muted text-foreground",
  primary: "border-primary/20 bg-primary/10 text-primary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  accent: "border-accent/50 bg-accent/20 text-primary",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 min-h-6 max-w-full items-center rounded-md border px-2 text-xs font-bold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function PositionBadge({ position }: { position: PlayerPosition }) {
  const tone: BadgeTone =
    position === "WICKET_KEEPER"
      ? "accent"
      : position === "ALL_ROUNDER"
        ? "primary"
        : position === "BOWLER"
          ? "warning"
          : "neutral";

  return <Badge tone={tone}>{playerPositionLabels[position]}</Badge>;
}

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  const tone: BadgeTone =
    status === "UPCOMING" ? "success" : status === "LOCKED" ? "warning" : "neutral";

  return <Badge tone={tone}>{roundStatusLabels[status]}</Badge>;
}

export function ChipBadge({ chipType }: { chipType: ChipType }) {
  return (
    <Badge tone={chipType === "WILDCARD" ? "accent" : "primary"}>
      {chipType === "WILDCARD" ? "Wildcard" : "Triple Captain"}
    </Badge>
  );
}
