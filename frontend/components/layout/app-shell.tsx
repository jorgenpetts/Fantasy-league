"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  Shield,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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
  return pathname === "/login" || pathname === "/register";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useCurrentUser();
  const user = data?.user;

  if (shouldUseBareLayout(pathname)) {
    return <div className="min-h-screen bg-background">{children}</div>;
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

          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {user ? "Signed in" : "Session"}
            </span>
            <span className="font-semibold">{user?.name ?? "Guest"}</span>
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
