"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { adminMutationErrors } from "../errors";
import type { Confirmation, FieldErrors, ValidationResult } from "../types";

export function AdminFormDialog<T>({
  title,
  description,
  submitLabel = "Save Changes",
  submitVariant = "primary",
  successMessage,
  validate,
  getConfirmation,
  onSave,
  onClose,
  children,
}: {
  title: string;
  description: string;
  submitLabel?: string;
  submitVariant?: "primary" | "danger";
  successMessage: string;
  validate: (form: FormData) => ValidationResult<T>;
  getConfirmation?: (data: T) => Confirmation | null;
  onSave: (data: T) => Promise<unknown>;
  onClose: () => void;
  children: (errors: FieldErrors) => ReactNode;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    data: T;
    prompt: Confirmation;
  } | null>(null);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const cancelRef = useRef<HTMLDivElement>(null);
  const [opener] = useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    if (confirmation) cancelRef.current?.querySelector("button")?.focus();
  }, [confirmation]);

  function close() {
    if (!submitting.current) onClose();
  }

  async function save(data: T) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    try {
      await onSave(data);
      toast.success(successMessage);
      onClose();
    } catch (error) {
      setErrors(adminMutationErrors(error));
      setConfirmation(null);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const result = validate(new FormData(event.currentTarget));
    setErrors(result.errors);
    if (Object.keys(result.errors).length) {
      const first = event.currentTarget.elements.namedItem(
        Object.keys(result.errors)[0],
      );
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    const prompt = getConfirmation?.(result.data);
    if (prompt) setConfirmation({ data: result.data, prompt });
    else void save(result.data);
  }

  return (
    <DialogRoot open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener?.isConnected) opener.focus();
          else {
            const heading = document.querySelector<HTMLElement>("main h1");
            if (heading) {
              heading.tabIndex = -1;
              heading.focus();
            }
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{confirmation?.prompt.title ?? title}</DialogTitle>
          <DialogDescription>
            {confirmation?.prompt.description ?? description}
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          onSubmit={submit}
          noValidate
          hidden={Boolean(confirmation)}
        >
          <fieldset disabled={pending} className="space-y-4 p-5">
            {errors.form ? (
              <p
                role="alert"
                className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
              >
                {errors.form}
              </p>
            ) : null}
            {Object.keys(errors).length && !errors.form ? (
              <p role="alert" className="text-sm text-danger">
                Please correct the highlighted fields.
              </p>
            ) : null}
            {children(errors)}
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" variant={submitVariant} isLoading={pending}>
              {pending ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
        {confirmation ? (
          <DialogFooter>
            <div ref={cancelRef}>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setConfirmation(null);
                  requestAnimationFrame(() =>
                    formRef.current
                      ?.querySelector<HTMLButtonElement>(
                        'button[type="submit"]',
                      )
                      ?.focus(),
                  );
                }}
              >
                Cancel
              </Button>
            </div>
            <Button
              type="button"
              variant="danger"
              isLoading={pending}
              onClick={() => void save(confirmation.data)}
            >
              {pending ? "Saving..." : confirmation.prompt.label}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </DialogRoot>
  );
}
