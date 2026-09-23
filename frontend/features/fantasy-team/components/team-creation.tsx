"use client";

import { FormEvent, useState } from "react";
import { Flag } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import { getApiErrorMessage } from "@/lib/form-errors";
import type { Season } from "@/types/api";
import { useCreateFantasyTeam } from "../hooks";

export function TeamCreation({ season }: { season: Season }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const createTeam = useCreateFantasyTeam();
  const { showToast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter a name for your fantasy team.");
      return;
    }

    if (trimmedName.length > 80) {
      setError("Team name must be 80 characters or fewer.");
      return;
    }

    setError(undefined);

    try {
      await createTeam.mutateAsync({ name: trimmedName, seasonId: season.id });
      showToast({
        title: "Fantasy team created",
        description: "Now build your first 11-player squad.",
        variant: "success",
      });
    } catch (mutationError) {
      setError(
        getApiErrorMessage(
          mutationError,
          "Your fantasy team could not be created.",
        ),
      );
    }
  }

  return (
    <div className="mx-auto max-w-xl py-4 sm:py-10">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Flag className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Create Your Fantasy Team</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Choose your team identity for {season.name}. You can then build
                your squad for the current round.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Input
              label="Team name"
              name="teamName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Boundary Bashers"
              maxLength={80}
              required
              error={error}
              autoComplete="off"
            />
            <Button
              type="submit"
              className="w-full sm:w-auto"
              isLoading={createTeam.isPending}
            >
              Create Team
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
