import type { PlayerPosition, RoundStatus } from "@/types/api";

export type PlayerInput = {
  firstName: string;
  lastName: string;
  position: PlayerPosition;
  price: number;
  active: boolean;
};

export type SeasonInput = {
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

export type RoundInput = {
  seasonId: string;
  roundNumber: number;
  name: string;
  deadline: string;
  status: RoundStatus;
};

export type FieldErrors = Record<string, string>;
export type ValidationResult<T> = { data: T; errors: FieldErrors };
export type Confirmation = {
  title: string;
  description: string;
  label: string;
};
