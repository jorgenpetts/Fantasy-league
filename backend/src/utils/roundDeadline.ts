import { RoundStatus, type Round } from "@prisma/client";

export type RoundDeadlineState = {
  isLocked: boolean;
  canEdit: boolean;
};

export function isRoundLocked(
  round: Pick<Round, "status" | "deadline">,
  now = new Date(),
): boolean {
  return round.status !== RoundStatus.UPCOMING || now >= round.deadline;
}

export function canEditRound(
  round: Pick<Round, "status" | "deadline">,
  now = new Date(),
): boolean {
  return round.status === RoundStatus.UPCOMING && now < round.deadline;
}

export function getRoundDeadlineState(
  round: Pick<Round, "status" | "deadline">,
  now = new Date(),
): RoundDeadlineState {
  return {
    isLocked: isRoundLocked(round, now),
    canEdit: canEditRound(round, now),
  };
}
