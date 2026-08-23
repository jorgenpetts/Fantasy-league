import { api } from "@/lib/api";
import type {
  DashboardSummary,
  FantasyRules,
  Leaderboard,
  Player,
} from "@/types/api";

export function getDashboard() {
  return api.get<{ dashboard: DashboardSummary }>("/dashboard");
}

export function getFantasyRules() {
  return api.get<{ fantasyRules: FantasyRules }>("/fantasy-rules");
}

export function getLeaderboard(params?: { seasonId?: string; roundId?: string }) {
  const query = new URLSearchParams();

  if (params?.seasonId) query.set("seasonId", params.seasonId);
  if (params?.roundId) query.set("roundId", params.roundId);

  return api.get<{ leaderboard: Leaderboard }>(
    `/leaderboard${query.size ? `?${query}` : ""}`,
  );
}

export function getPlayers(params?: {
  position?: string;
  active?: boolean;
  search?: string;
  seasonId?: string;
}) {
  const query = new URLSearchParams();

  if (params?.position) query.set("position", params.position);
  if (typeof params?.active === "boolean") {
    query.set("active", String(params.active));
  }
  if (params?.search) query.set("search", params.search);
  if (params?.seasonId) query.set("seasonId", params.seasonId);

  return api.get<{ players: Player[] }>(
    `/players${query.size ? `?${query}` : ""}`,
  );
}
