"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/team", label: "Current Team" },
  { href: "/team/history", label: "Round History" },
];

export function TeamHistoryNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="My Team views"
      className="mb-6 inline-flex max-w-full overflow-hidden rounded-md border border-border bg-surface p-1"
    >
      {items.map((item) => {
        const active =
          item.href === "/team"
            ? pathname === "/team"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
