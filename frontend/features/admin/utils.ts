import type { Round } from "../../types/api.ts";

export const adminNavigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/rounds", label: "Rounds" },
  { href: "/admin/performances", label: "Performances" },
];

export function isAdminNavActive(pathname: string, href: string) {
  return (
    pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))
  );
}

// Prefer work awaiting results, then the next editable round, then latest history.
export function getOverviewRound(rounds: Round[]) {
  const ordered = [...rounds].sort(
    (a, b) =>
      a.deadline.localeCompare(b.deadline) || a.roundNumber - b.roundNumber,
  );
  return (
    ordered.find((round) => round.status !== "COMPLETED" && round.isLocked) ??
    ordered.find((round) => round.canEdit) ??
    ordered.at(-1) ??
    null
  );
}
