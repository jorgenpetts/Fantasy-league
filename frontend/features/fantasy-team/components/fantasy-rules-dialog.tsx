"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatPlayerPrice,
  getPlayerPositionLabel,
} from "@/lib/format";
import type { FantasyRules, PlayerPosition } from "@/types/api";
import { POSITION_ORDER } from "../utils";

const scoringLabels: Record<string, string> = {
  pointsPerRun: "Each run",
  notOutBonus: "Not out",
  fiftyBonus: "50-run bonus",
  centuryBonus: "100-run bonus",
  duckPenalty: "Duck",
  pointsPerWicket: "Each wicket",
  pointsPerMaiden: "Each maiden",
  threeWicketBonus: "3-wicket bonus",
  fiveWicketBonus: "5-wicket bonus",
  expensiveBowlingPenalty: "50+ runs conceded without a wicket",
  catch: "Catch",
  droppedCatch: "Dropped catch",
  stumping: "Stumping",
  runOut: "Run out",
};

const scoringOrder = [
  "pointsPerRun",
  "notOutBonus",
  "fiftyBonus",
  "centuryBonus",
  "duckPenalty",
  "pointsPerWicket",
  "pointsPerMaiden",
  "threeWicketBonus",
  "fiveWicketBonus",
  "expensiveBowlingPenalty",
  "catch",
  "droppedCatch",
  "stumping",
  "runOut",
];

function RuleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-bold text-foreground">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function points(value: number) {
  return `${value > 0 ? "+" : ""}${value} pts`;
}

function scoringPoints(key: string, value: number) {
  if (key === "duckPenalty" || key === "expensiveBowlingPenalty") {
    return `-${Math.abs(value)} pts`;
  }

  return points(value);
}

function times(count: number) {
  return `${count} ${count === 1 ? "time" : "times"}`;
}

export function FantasyRulesDialog({ rules }: { rules: FantasyRules }) {
  const [open, setOpen] = useState(false);

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={<BookOpen aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        View Fantasy Rules
      </Button>

      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-hidden sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Fantasy Rules</DialogTitle>
          <DialogDescription>
            How to build your squad and score points each round.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5">
          <RuleSection title="Squad">
            <p>
              Select {rules.squad.size} players within a budget of{" "}
              {formatPlayerPrice(rules.squad.budget)}. Every selected player is
              active; there is no bench.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {POSITION_ORDER.map((position: PlayerPosition) => (
                <div
                  key={position}
                  className="rounded-md bg-surface-muted p-3 text-center"
                >
                  <dt className="text-xs font-semibold">
                    {getPlayerPositionLabel(position)}
                  </dt>
                  <dd className="mt-1 text-lg font-black text-foreground">
                    {rules.squad.positions[position]}
                  </dd>
                </div>
              ))}
            </dl>
          </RuleSection>

          <RuleSection title="Captain">
            <p>
              Choose one captain. Their points are multiplied by{" "}
              {rules.scoring.captainMultiplier}. When Triple Captain is active,
              their points are multiplied by {rules.scoring.tripleCaptainMultiplier}.
            </p>
          </RuleSection>

          <RuleSection title="Transfers and deadlines">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                You receive {rules.transfers.freePerRound} free transfers each
                round.
              </li>
              <li>
                Each extra transfer deducts {rules.transfers.extraTransferPenalty}{" "}
                points from your round score.
              </li>
              <li>
                Your lineup can be edited until the round deadline. It is locked
                after the deadline and saved in your team history.
              </li>
            </ul>
          </RuleSection>

          <RuleSection title="Chips">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Wildcard: unlimited transfers for the round with no transfer
                deduction. Available {times(rules.chips.perSeason.WILDCARD)} per
                season.
              </li>
              <li>
                Triple Captain: your captain scores triple points. Available{" "}
                {times(rules.chips.perSeason.TRIPLE_CAPTAIN)} per season.
              </li>
              <li>Only one chip can be active in a round.</li>
            </ul>
          </RuleSection>

          <RuleSection title="Scoring">
            <dl className="overflow-hidden rounded-md border border-border">
              {scoringOrder.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 border-b border-border px-3 py-2 last:border-b-0 odd:bg-surface-muted/50"
                >
                  <dt>{scoringLabels[key]}</dt>
                  <dd className="shrink-0 font-bold text-foreground">
                    {scoringPoints(key, rules.scoring[key])}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs">
              The bowling deduction applies when a player concedes{" "}
              {rules.scoring.expensiveBowlingRunsThreshold} or more runs without
              taking a wicket.
            </p>
          </RuleSection>
        </div>

        <DialogFooter className="shrink-0">
          <DialogClose asChild>
            <Button type="button">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
