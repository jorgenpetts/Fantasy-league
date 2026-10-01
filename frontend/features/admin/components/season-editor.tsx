"use client";

import { Input } from "@/components/ui/input";
import type { Season } from "@/types/api";
import { useSaveSeason } from "../hooks";
import { changedFields, validateSeason } from "../validation";
import { AdminFormDialog } from "./admin-form-dialog";

export function SeasonEditor({
  season,
  onClose,
}: {
  season: Season | null;
  onClose: () => void;
}) {
  const mutation = useSaveSeason();
  return (
    <AdminFormDialog
      title={season ? "Edit Season" : "Create Season"}
      description="Manage the season’s name, dates and active state."
      submitLabel={season ? "Save Changes" : "Create Season"}
      successMessage={
        season ? "Season updated successfully." : "Season created successfully."
      }
      validate={validateSeason}
      onClose={onClose}
      getConfirmation={(data) =>
        data.active && !season?.active
          ? {
              title: `Activate ${data.name}?`,
              description:
                "This will become the current fantasy season. Any other active season will be deactivated automatically; its historical records remain available.",
              label: "Activate Season",
            }
          : season?.active && !data.active
            ? {
                title: `Deactivate ${data.name}?`,
                description:
                  "There will be no active fantasy season until another season is activated. Historical records remain available.",
                label: "Deactivate Season",
              }
            : null
      }
      onSave={async (data) => {
        if (season) {
          // Date-only controls must not silently change existing timestamps on a name edit.
          if (data.startDate.slice(0, 10) === season.startDate.slice(0, 10))
            data.startDate = season.startDate;
          if (data.endDate.slice(0, 10) === season.endDate.slice(0, 10))
            data.endDate = season.endDate;
          const input = changedFields(
            {
              name: season.name,
              startDate: season.startDate,
              endDate: season.endDate,
              active: season.active,
            },
            data,
          );
          if (Object.keys(input).length)
            await mutation.mutateAsync({ id: season.id, input });
        } else await mutation.mutateAsync({ input: data });
      }}
    >
      {(errors) => (
        <>
          <Input
            label="Season name"
            name="name"
            defaultValue={season?.name}
            maxLength={120}
            error={errors.name}
            required
          />
          <Input
            label="Start date"
            name="startDate"
            type="date"
            defaultValue={season?.startDate.slice(0, 10)}
            error={errors.startDate}
            required
          />
          <Input
            label="End date"
            name="endDate"
            type="date"
            defaultValue={season?.endDate.slice(0, 10)}
            error={errors.endDate}
            required
          />
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              name="active"
              type="checkbox"
              defaultChecked={season?.active ?? false}
              className="size-4 accent-primary"
            />
            Active season
          </label>
          <p className="text-sm text-muted-foreground">
            Activating this season automatically deactivates any other active
            season.
          </p>
        </>
      )}
    </AdminFormDialog>
  );
}
