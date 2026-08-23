import type { CricketPlayer } from "@prisma/client";

export function calculateSquadValue(
  players: Pick<CricketPlayer, "price">[],
): number {
  return players.reduce((total, player) => total + player.price, 0);
}
