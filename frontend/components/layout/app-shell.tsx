"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  LogOut,
  Home,
  Shield,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { Suspense, useEffect, type ReactNode } from "react";
import { useAuth, isUnauthorized } from "@/hooks/use-auth";
import { getSafeNextPath, isAdminRoute, isGuestRoute, isProtectedRoute } from "@/lib/routes";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AUTH_UNAUTHORIZED_EVENT } from "@/components/providers/query-provider";
import { LoadingState } from "@/components/ui/state";

const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/team", label: "My Team", icon: UserRound },
  { href: "/players", label: "Players", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const mobileNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/team", label: "Team", icon: UserRound },
  { href: "/players", label: "Players", icon: Users },
  { href: "/leaderboard", label: "League", icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  compact = false,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-sm font-semibold transition-colors",
        compact ? "flex-col gap-1 px-2 py-2 text-xs" : "px-3 py-2",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon className={compact ? "size-5" : "size-4"} aria-hidden="true" />
      {label}
    </Link>
  );
}

function shouldUseBareLayout(pathname: string) {
  return isGuestRoute(pathname);
}

function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    authError,
    logout,
    isLoggingOut,
  } = useAuth();
  const isGuest = isGuestRoute(pathname);
  const isProtected = isProtectedRoute(pathname);
  const unauthorized = isUnauthorized(authError);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isProtected && !isAuthenticated) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (isGuest && isAuthenticated && !isLoggingOut) {
      router.replace(getSafeNextPath(searchParams.get("next")));
      return;
    }

    if (isAdminRoute(pathname) && isAuthenticated && !isAdmin) {
      router.replace("/");
    }
  }, [
    isAdmin,
    isAuthenticated,
    isGuest,
    isLoading,
    isLoggingOut,
    isProtected,
    pathname,
    router,
    searchParams,
  ]);

  useEffect(() => {
    function handleUnauthorized() {
      if (isGuestRoute(pathname)) {
        return;
      }

      queryClient.removeQueries();
      queryClient.setQueryData(queryKeys.auth.me, null);
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [pathname, queryClient, router]);

  if (shouldUseBareLayout(pathname)) {
    if (isAuthenticated && !isLoggingOut) {
      return (
        <div className="min-h-screen bg-background p-4">
          <LoadingState label="Checking your session" />
        </div>
      );
    }

    return <div className="min-h-screen bg-background">{children}</div>;
  }

  if (
    isLoading ||
    (isProtected && !isAuthenticated && !unauthorized) ||
    (isAdminRoute(pathname) && isAuthenticated && !isAdmin)
  ) {
    return (
      <div className="min-h-screen bg-background p-4">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (isProtected && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4">
        <LoadingState label="Redirecting to login" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
              ECC
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">
                ECC Fantasy League
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Cricket fantasy manager
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {primaryNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
            {user?.role === "ADMIN" ? (
              <NavLink href="/admin" label="Admin" icon={Shield} />
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            {user?.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="rounded-md p-2 text-primary hover:bg-surface-muted md:hidden"
                aria-label="Admin"
              >
                <Shield className="size-5" />
              </Link>
            ) : null}
            <div className="hidden items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm sm:flex">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                {user?.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="font-semibold">{user?.name}</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {user?.role}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              isLoading={isLoggingOut}
              icon={<LogOut aria-hidden="true" />}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {children}

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Mobile primary"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {mobileNav.map((item) => (
            <NavLink key={item.href} {...item} compact />
          ))}
        </div>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-4">
          <LoadingState label="Checking your session" />
        </div>
      }
    >
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}
