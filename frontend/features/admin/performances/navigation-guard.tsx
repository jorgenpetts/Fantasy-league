"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import type { Drafts } from "./model";

type Guard = { dirty: boolean; busy: boolean; discard: () => void };
type NavigationContext = {
  register: (guard: Guard | null) => void;
  request: (action: () => void) => void;
  drafts: Record<string, Drafts>;
  updateDrafts: (roundId: string, update: (current: Drafts) => Drafts) => void;
};
const Context = createContext<NavigationContext | null>(null);

export function AdminNavigationProvider({ children }: { children: ReactNode }) {
  const guard = useRef<Guard | null>(null);
  const [destination, setDestination] = useState<{ action: () => void } | null>(
    null,
  );
  // Keep round drafts across browser back/forward between admin views.
  const [drafts, setDrafts] = useState<Record<string, Drafts>>({});
  const register = useCallback((next: Guard | null) => {
    guard.current = next;
  }, []);
  const request = useCallback((action: () => void) => {
    if (guard.current?.busy) {
      toast.info("Please wait for the current operation to finish.");
      return;
    }
    if (guard.current?.dirty) setDestination({ action });
    else action();
  }, []);
  const updateDrafts = useCallback(
    (roundId: string, update: (current: Drafts) => Drafts) => {
      setDrafts((current) => ({
        ...current,
        [roundId]: update(current[roundId] ?? {}),
      }));
    },
    [],
  );
  const value = useMemo(
    () => ({ register, request, drafts, updateDrafts }),
    [register, request, drafts, updateDrafts],
  );
  return (
    <Context.Provider value={value}>
      {children}
      <Dialog
        open={Boolean(destination)}
        title="Unsaved performance changes"
        description="Discard your unsaved performance changes and continue?"
        confirmLabel="Discard and Continue"
        onClose={() => setDestination(null)}
        onConfirm={() => {
          const action = destination?.action;
          guard.current?.discard();
          setDestination(null);
          action?.();
        }}
      />
    </Context.Provider>
  );
}

export function useAdminNavigation() {
  const context = useContext(Context);
  if (!context) throw new Error("AdminNavigationProvider is required.");
  return context;
}

export function AdminLink(
  props: Omit<ComponentProps<typeof Link>, "href"> & { href: string },
) {
  const { request } = useAdminNavigation();
  const router = useRouter();
  return (
    <Link
      {...props}
      onNavigate={(event) => {
        props.onNavigate?.(event);
        event.preventDefault();
        const href = props.href;
        request(() =>
          props.replace ? router.replace(href) : router.push(href),
        );
      }}
    />
  );
}
