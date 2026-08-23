import { type CricketPlayer } from "@prisma/client";
import { FANTASY_RULES } from "../config/fantasyRules.js";
import { AppError } from "../utils/AppError.js";
import { calculateSquadValue } from "../utils/squadValue.js";

export function validateSquadPlayers(
  players: Pick<CricketPlayer, "id" | "position" | "price" | "active">[],
  captainId: string,
): void {
  const playerIds = players.map((player) => player.id);
  const uniquePlayerIds = new Set(playerIds);

  if (uniquePlayerIds.size !== playerIds.length) {
    throw new AppError(400, "A player cannot be selected more than once.");
  }

  if (!uniquePlayerIds.has(captainId)) {
    throw new AppError(400, "Captain must be selected from the squad.");
  }

  if (players.length !== FANTASY_RULES.squad.size) {
    throw new AppError(
      400,
      `Squad must contain exactly ${FANTASY_RULES.squad.size} players.`,
    );
  }

  const inactivePlayer = players.find((player) => !player.active);

  if (inactivePlayer) {
    throw new AppError(400, "All selected players must be active.");
  }

  for (const [position, requiredCount] of Object.entries(
    FANTASY_RULES.squad.positions,
  )) {
    const actualCount = players.filter(
      (player) => player.position === position,
    ).length;

    if (actualCount !== requiredCount) {
      throw new AppError(
        400,
        `Squad must contain exactly ${requiredCount} ${position.toLowerCase().replace("_", " ")} players.`,
      );
    }
  }

  if (calculateSquadValue(players) > FANTASY_RULES.squad.budget) {
    throw new AppError(
      400,
      `Squad exceeds the R${FANTASY_RULES.squad.budget.toLocaleString("en-ZA")} budget.`,
    );
  }
}
