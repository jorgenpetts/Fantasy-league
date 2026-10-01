"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { roundStatusLabels, formatDeadline } from "@/lib/format";
import { toLocalDateTime } from "@/lib/date-time";
import type { Round, Season } from "@/types/api";
import { useSaveRound } from "../hooks";
import { changedFields, validateRound } from "../validation";
import type { Confirmation } from "../types";
import { AdminFormDialog } from "./admin-form-dialog";

export function RoundEditor({
  round,
  seasonId,
  seasons,
  rounds,
  onClose,
}: {
  round: Round | null;
  seasonId: string;
  seasons: Season[];
  rounds: Round[];
  onClose: () => void;
}) {
  const mutation = useSaveRound();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <AdminFormDialog
      title={round ? "Edit Round" : "Create Round"}
      description={
        round?.status === "COMPLETED"
          ? "This round is completed. Make changes only when correcting its details or status."
          : "Set the round’s season, deadline and status."
      }
      submitLabel={round ? "Save Changes" : "Create Round"}
      successMessage={
        round ? "Round updated successfully." : "Round created successfully."
      }
      validate={(form) => {
        const result = validateRound(form);
        const enteredDeadline = String(form.get("deadline") ?? "");
        if (
          round &&
          enteredDeadline &&
          enteredDeadline ===
            toLocalDateTime(round.deadline).slice(0, enteredDeadline.length)
        )
          result.data.deadline = round.deadline;
        if (
          rounds.some(
            (item) =>
              item.id !== round?.id &&
              item.seasonId === result.data.seasonId &&
              item.roundNumber === result.data.roundNumber,
          )
        ) {
          result.errors.roundNumber =
            "A round with this number already exists for this season.";
        }
        return result;
      }}
      getConfirmation={(data): Confirmation | null => {
        const notices: string[] = [];
        if (round && data.deadline !== round.deadline)
          notices.push(
            `Deadline: ${formatDeadline(round.deadline)} → ${formatDeadline(data.deadline)} (${timezone}). Changing the deadline may affect whether users can edit their teams.`,
          );
        if (data.status === "COMPLETED" && round?.status !== "COMPLETED")
          notices.push(
            "This marks the round’s results as final. Ensure player performances and scoring have been reviewed first. This action does not recalculate scores.",
          );
        else if (round && data.status !== round.status)
          notices.push(
            data.status === "UPCOMING"
              ? "Upcoming rounds allow team editing before their deadline. Reopening this round may allow changes to existing selections."
              : "Locking the round prevents users from editing their lineups.",
          );
        if (round && data.seasonId !== round.seasonId)
          notices.push(
            "Moving this round to another season affects its competition context and existing results.",
          );
        return notices.length
          ? {
              title:
                data.status === "COMPLETED" && round?.status !== "COMPLETED"
                  ? `Complete Round ${data.roundNumber}?`
                  : `Update Round ${data.roundNumber}?`,
              description: notices.join(" "),
              label:
                data.status === "COMPLETED" && round?.status !== "COMPLETED"
                  ? "Complete Round"
                  : "Confirm Changes",
            }
          : null;
      }}
      onClose={onClose}
      onSave={async (data) => {
        if (round) {
          const input = changedFields(
            {
              seasonId: round.seasonId,
              roundNumber: round.roundNumber,
              name: round.name,
              deadline: round.deadline,
              status: round.status,
            },
            data,
          );
          if (Object.keys(input).length)
            await mutation.mutateAsync({ id: round.id, input });
        } else await mutation.mutateAsync({ input: data });
      }}
    >
      {(errors) => (
        <>
          <Select
            label="Season"
            name="seasonId"
            defaultValue={round?.seasonId ?? seasonId}
            options={seasons.map((season) => ({
              value: season.id,
              label: season.name,
            }))}
            error={errors.seasonId}
            required
          />
          <Input
            label="Round number"
            name="roundNumber"
            inputMode="numeric"
            defaultValue={round?.roundNumber}
            error={errors.roundNumber}
            required
          />
          <Input
            label="Round name"
            name="name"
            defaultValue={round?.name}
            maxLength={120}
            error={errors.name}
            required
          />
          <Input
            label={`Deadline (${timezone})`}
            name="deadline"
            type="datetime-local"
            step="1"
            defaultValue={round ? toLocalDateTime(round.deadline) : undefined}
            error={errors.deadline}
            className="min-w-0"
            required
          />
          <p className="text-sm text-muted-foreground">
            Times use your browser’s timezone: {timezone}.
          </p>
          <Select
            label="Stored status"
            name="status"
            defaultValue={round?.status ?? "UPCOMING"}
            options={Object.entries(roundStatusLabels).map(
              ([value, label]) => ({ value, label }),
            )}
            error={errors.status}
            required
          />
          <p className="text-sm text-muted-foreground">
            Upcoming allows editing before the deadline. Locked closes editing.
            Completed marks results as final.
          </p>
        </>
      )}
    </AdminFormDialog>
  );
}

export function CompleteRoundDialog({
  round,
  onClose,
}: {
  round: Round;
  onClose: () => void;
}) {
  const mutation = useSaveRound();
  return (
    <AdminFormDialog
      title={`Complete Round ${round.roundNumber}?`}
      description="This marks the round’s results as final. Ensure player performances and scoring have been reviewed first. This action does not recalculate scores."
      submitLabel="Complete Round"
      submitVariant="danger"
      successMessage="Round completed successfully."
      validate={() => ({ data: { status: "COMPLETED" as const }, errors: {} })}
      onSave={(input) => mutation.mutateAsync({ id: round.id, input })}
      onClose={onClose}
    >
      {() => (
        <div className="space-y-3">
          <p className="font-semibold">Round {round.roundNumber} · {round.name}</p>
          <p className="text-sm">Before continuing, confirm that:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Player performances have been entered.</li>
            <li>Scores have been recalculated.</li>
            <li>Results have been reviewed.</li>
          </ul>
        </div>
      )}
    </AdminFormDialog>
  );
}
