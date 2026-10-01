"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { isGuestRoute } from "@/lib/routes";

export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

function handleUnauthorized(error: unknown): void {
  if (!(error instanceof ApiError) || error.status !== 401) {
    return;
  }

  if (typeof window === "undefined" || isGuestRoute(window.location.pathname)) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        queryCache: new QueryCache({
          onError: handleUnauthorized,
        }),
        mutationCache: new MutationCache({
          onError: handleUnauthorized,
        }),
        defaultOptions: {
          queries: {
            retry: (failureCount, error) =>
              !(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failureCount < 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      });

      return client;
    },
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
