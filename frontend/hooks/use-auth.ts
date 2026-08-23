"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getCurrentUser } from "@/services/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getCurrentUser,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }

      return failureCount < 1;
    },
  });
}
