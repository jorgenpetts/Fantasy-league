"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPlayerPrice, playerPositionLabels } from "@/lib/format";
import type { Player } from "@/types/api";
import { useSavePlayer } from "../hooks";
import {
  changedFields,
  positiveDatabaseInteger,
  validatePlayer,
} from "../validation";
import { AdminFormDialog } from "./admin-form-dialog";

export const positionOptions = Object.entries(playerPositionLabels).map(
  ([value, label]) => ({ value, label }),
);

export function PlayerEditor({
  player,
  onClose,
}: {
  player: Player | null;
  onClose: () => void;
}) {
  const mutation = useSavePlayer();
  const [price, setPrice] = useState(player ? String(player.price) : "");
  const preview = positiveDatabaseInteger(price);
  return (
    <AdminFormDialog
      title={
        player ? `Edit ${player.firstName} ${player.lastName}` : "Add Player"
      }
      description="Set the player’s details and availability for fantasy selection."
      submitLabel={player ? "Save Changes" : "Create Player"}
      successMessage={
        player ? "Player updated successfully." : "Player created successfully."
      }
      validate={validatePlayer}
      onClose={onClose}
      getConfirmation={(data) =>
        player?.active && !data.active
          ? {
              title: `Deactivate ${data.firstName} ${data.lastName}?`,
              description:
                "This player will no longer be available for new fantasy selections. Historical records will remain unchanged.",
              label: "Deactivate Player",
            }
          : null
      }
      onSave={async (data) => {
        if (player) {
          const input = changedFields(
            {
              firstName: player.firstName,
              lastName: player.lastName,
              position: player.position,
              price: player.price,
              active: player.active,
            },
            data,
          );
          if (Object.keys(input).length)
            await mutation.mutateAsync({ id: player.id, input });
        } else await mutation.mutateAsync({ input: data });
      }}
    >
      {(errors) => (
        <>
          <Input
            label="First name"
            name="firstName"
            defaultValue={player?.firstName}
            maxLength={80}
            error={errors.firstName}
            required
          />
          <Input
            label="Last name"
            name="lastName"
            defaultValue={player?.lastName}
            maxLength={80}
            error={errors.lastName}
            required
          />
          <Select
            label="Position"
            name="position"
            defaultValue={player?.position}
            options={positionOptions}
            error={errors.position}
            required
          />
          <Input
            label="Price (ZAR)"
            name="price"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            error={errors.price}
            required
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {preview === null
              ? "Enter whole rand, for example 8500000."
              : `Display price: ${formatPlayerPrice(preview)}`}
          </p>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              name="active"
              type="checkbox"
              defaultChecked={player?.active ?? true}
              className="size-4 accent-primary"
            />
            Active — available for selection
          </label>
        </>
      )}
    </AdminFormDialog>
  );
}
