import { AlertCircle, CheckCircle2 } from "lucide-react";
import { formatPlayerPrice } from "@/lib/format";

export function ValidationSummary({
  isValid,
  issues,
  overBudgetBy,
}: {
  isValid: boolean;
  issues: string[];
  overBudgetBy: number;
}) {
  if (isValid) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/25 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
        <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
        Squad complete and ready to save.
      </div>
    );
  }

  return (
    <div
      className="rounded-md border border-danger/25 bg-danger/5 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-danger">
        <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
        Squad needs attention
      </div>
      <ul className="mt-2 space-y-1 pl-7 text-sm text-foreground">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
        {overBudgetBy > 0 ? (
          <li>You are {formatPlayerPrice(overBudgetBy)} over budget.</li>
        ) : null}
      </ul>
    </div>
  );
}
