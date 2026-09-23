import type {
  FantasyLineup,
  FantasyRules,
  Player,
  PlayerPosition,
} from "@/types/api";

export const POSITION_ORDER: PlayerPosition[] = [
  "WICKET_KEEPER",
  "BATTER",
  "ALL_ROUNDER",
  "BOWLER",
];

export function getPlayerName(player: Pick<Player, "firstName" | "lastName">) {
  return `${player.firstName} ${player.lastName}`;
}

export function calculateSquadValue(players: Pick<Player, "price">[]) {
  return players.reduce((total, player) => total + player.price, 0);
}

export function getPositionCounts(players: Pick<Player, "position">[]) {
  return POSITION_ORDER.reduce<Record<PlayerPosition, number>>(
    (counts, position) => ({
      ...counts,
      [position]: players.filter((player) => player.position === position).length,
    }),
    {
      WICKET_KEEPER: 0,
      BATTER: 0,
      ALL_ROUNDER: 0,
      BOWLER: 0,
    },
  );
}

export function validateDraft(
  players: Player[],
  captainId: string | null,
  rules: FantasyRules,
) {
  const issues: string[] = [];
  const counts = getPositionCounts(players);
  const uniqueIds = new Set(players.map((player) => player.id));

  if (players.length < rules.squad.size) {
    const missing = rules.squad.size - players.length;
    issues.push(`Select ${missing} more player${missing === 1 ? "" : "s"}.`);
  } else if (players.length > rules.squad.size) {
    const extra = players.length - rules.squad.size;
    issues.push(`Remove ${extra} player${extra === 1 ? "" : "s"}.`);
  }

  for (const position of POSITION_ORDER) {
    const required = rules.squad.positions[position];
    const difference = required - counts[position];

    if (difference > 0) {
      issues.push(`${difference} more ${position === "ALL_ROUNDER" ? "all-rounder" : position === "WICKET_KEEPER" ? "wicketkeeper" : position === "BATTER" ? "batter" : "bowler"}${difference === 1 ? "" : "s"} required.`);
    } else if (difference < 0) {
      issues.push(`Remove ${Math.abs(difference)} ${position === "ALL_ROUNDER" ? "all-rounder" : position === "WICKET_KEEPER" ? "wicketkeeper" : position === "BATTER" ? "batter" : "bowler"}${difference === -1 ? "" : "s"}.`);
    }
  }

  if (uniqueIds.size !== players.length) {
    issues.push("A player cannot be selected more than once.");
  }

  if (players.some((player) => !player.active)) {
    issues.push("Replace inactive players before saving this squad.");
  }

  if (!captainId || !uniqueIds.has(captainId)) {
    issues.push("Choose a captain from your squad.");
  }

  const squadValue = calculateSquadValue(players);
  if (squadValue > rules.squad.budget) {
    issues.push("Squad exceeds the available budget.");
  }

  return {
    isValid: issues.length === 0,
    issues,
    counts,
    squadValue,
    remainingBudget: rules.squad.budget - squadValue,
  };
}

export function getPreviousPlayerIds(
  currentLineup: FantasyLineup | null,
  suggestedLineup: FantasyLineup | null,
  previousLineup: FantasyLineup | null,
) {
  if (previousLineup) {
    return previousLineup.players.map((player) => player.id);
  }

  if (!currentLineup) {
    return suggestedLineup?.players.map((player) => player.id) ?? null;
  }

  return null;
}

export function calculateProjectedTransfers(
  previousPlayerIds: string[] | null,
  draftPlayerIds: string[],
  rules: FantasyRules,
  wildcardActive: boolean,
) {
  const previousIds = previousPlayerIds ? new Set(previousPlayerIds) : null;
  const transfersMade = previousIds
    ? draftPlayerIds.filter((id) => !previousIds.has(id)).length
    : 0;
  const extraTransfers = Math.max(
    0,
    transfersMade - rules.transfers.freePerRound,
  );

  return {
    transfersMade,
    freeTransfers: rules.transfers.freePerRound,
    extraTransfers,
    transferPenalty: wildcardActive
      ? 0
      : extraTransfers * rules.transfers.extraTransferPenalty,
  };
}

export function getDraftSignature(playerIds: string[], captainId: string | null) {
  return `${[...playerIds].sort().join(",")}:${captainId ?? ""}`;
}

export function sortPlayersForMarket(
  players: Player[],
  sort: "points-desc" | "price-desc" | "price-asc" | "name-asc",
) {
  return [...players].sort((a, b) => {
    if (sort === "points-desc") {
      return (b.totalFantasyPoints ?? 0) - (a.totalFantasyPoints ?? 0);
    }
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "price-asc") return a.price - b.price;
    return getPlayerName(a).localeCompare(getPlayerName(b));
  });
}
