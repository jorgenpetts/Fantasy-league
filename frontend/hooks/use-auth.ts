"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type LoginPayload,
  type RegisterPayload,
} from "@/services/auth";

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

function clearUserSpecificCache(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.cancelQueries();
  // Keep the observed auth query so mounted route guards receive the signed-out
  // identity. Removing it first leaves observers attached to the old user.
  queryClient.setQueryData(queryKeys.auth.me, null);
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getCurrentUser,
    retry: (failureCount, error) => {
      if (isUnauthorized(error)) {
        return false;
      }

      return failureCount < 1;
    },
  });
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const user = currentUserQuery.data?.user ?? null;

  async function loadAuthenticatedUser() {
    clearUserSpecificCache(queryClient);
    await queryClient.fetchQuery({
      queryKey: queryKeys.auth.me,
      queryFn: getCurrentUser,
      staleTime: 0,
    });
  }

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: loadAuthenticatedUser,
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: loadAuthenticatedUser,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onMutate: () => {
      clearUserSpecificCache(queryClient);
    },
    onSettled: () => {
      clearUserSpecificCache(queryClient);
      router.replace("/login");
    },
  });

  return {
    user,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "ADMIN",
    isLoading: currentUserQuery.isLoading,
    isCheckingAuth: currentUserQuery.isLoading || currentUserQuery.isFetching,
    authError: currentUserQuery.error,
    login: (payload: LoginPayload) => loginMutation.mutateAsync(payload),
    register: (payload: RegisterPayload) =>
      registerMutation.mutateAsync(payload),
    logout: () => logoutMutation.mutate(),
    refreshUser: () => currentUserQuery.refetch(),
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}

export { isUnauthorized, clearUserSpecificCache };
