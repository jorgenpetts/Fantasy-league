"use client";

import { AdminLink as Link, useAdminNavigation } from "../performances/navigation-guard";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminNavigation, isAdminNavActive } from "../utils";

function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={mobile ? "Mobile admin" : "Admin"}
      className={
        mobile ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid gap-1"
      }
    >
      {adminNavigation.map(({ href, label }) => {
        const active = isAdminNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-3 text-sm font-semibold",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, logout, isLoggingOut } = useAuth();
  const { request } = useAdminNavigation();
  // AppShell performs the established login/access-denied redirects before this mounts.
  if (!isAdmin) return null;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/admin" className="font-bold text-primary">
            ECC Fantasy League <Badge>Admin</Badge>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-64 truncate text-sm sm:inline">{user?.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => request(logout)}
              isLoading={isLoggingOut}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border p-4 lg:block">
          <AdminNavigation />
          <Link
            href="/"
            className="mt-6 block rounded-md border-t border-border px-3 py-4 text-sm font-semibold text-primary"
          >
            ← Back to Fantasy App
          </Link>
        </aside>
        <div className="min-w-0">
          <div className="border-b border-border p-4 lg:hidden">
            <AdminNavigation mobile />
            <Link
              href="/"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              ← Back to Fantasy App
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
