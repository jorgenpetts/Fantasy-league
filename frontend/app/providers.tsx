"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/components/providers/query-provider";
import { ToastProvider } from "@/components/providers/toast-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}
