import type { PlayerPosition, RoundStatus } from "../../types/api.ts";
import { dateInputToIso, localDateTimeToIso } from "../../lib/date-time.ts";
import type {
  FieldErrors,
  PlayerInput,
  RoundInput,
  SeasonInput,
  ValidationResult,
} from "./types.ts";

const positions = ["WICKET_KEEPER", "BATTER", "ALL_ROUNDER", "BOWLER"];
const statuses = ["UPCOMING", "LOCKED", "COMPLETED"];
const text = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();

function requiredName(
  form: FormData,
  name: string,
  label: string,
  max: number,
  errors: FieldErrors,
) {
  const value = text(form, name);
  if (!value) errors[name] = `${label} is required.`;
  else if (value.length > max) errors[name] = `Use at most ${max} characters.`;
  return value;
}

// Prices and round numbers map to PostgreSQL Int columns. Accept plain whole units.
export function positiveDatabaseInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= 2_147_483_647
    ? number
    : null;
}

export function validatePlayer(form: FormData): ValidationResult<PlayerInput> {
  const errors: FieldErrors = {};
  const firstName = requiredName(form, "firstName", "First name", 80, errors);
  const lastName = requiredName(form, "lastName", "Last name", 80, errors);
  const position = text(form, "position");
  if (!positions.includes(position))
    errors.position = "Choose a valid position.";
  const price = positiveDatabaseInteger(text(form, "price"));
  if (price === null)
    errors.price = "Enter a whole ZAR amount from 1 to 2,147,483,647.";
  return {
    errors,
    data: {
      firstName,
      lastName,
      position: position as PlayerPosition,
      price: price ?? 0,
      active: form.get("active") === "on",
    },
  };
}

export function validateSeason(form: FormData): ValidationResult<SeasonInput> {
  const errors: FieldErrors = {};
  const name = requiredName(form, "name", "Season name", 120, errors);
  const startDate = dateInputToIso(text(form, "startDate"));
  const endDate = dateInputToIso(text(form, "endDate"));
  if (!startDate) errors.startDate = "Enter a valid start date.";
  if (!endDate) errors.endDate = "Enter a valid end date.";
  else if (startDate && endDate < startDate)
    errors.endDate = "End date must be on or after start date.";
  return {
    errors,
    data: {
      name,
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      active: form.get("active") === "on",
    },
  };
}

export function validateRound(form: FormData): ValidationResult<RoundInput> {
  const errors: FieldErrors = {};
  const name = requiredName(form, "name", "Round name", 120, errors);
  const seasonId = text(form, "seasonId");
  if (!seasonId) errors.seasonId = "Choose a season.";
  const roundNumber = positiveDatabaseInteger(text(form, "roundNumber"));
  if (roundNumber === null)
    errors.roundNumber = "Enter a positive whole round number.";
  const deadline = localDateTimeToIso(text(form, "deadline"));
  if (!deadline) errors.deadline = "Enter a valid local date and time.";
  const status = text(form, "status");
  if (!statuses.includes(status))
    errors.status = "Choose a valid round status.";
  return {
    errors,
    data: {
      name,
      seasonId,
      roundNumber: roundNumber ?? 0,
      deadline: deadline ?? "",
      status: status as RoundStatus,
    },
  };
}

/** Send only changed fields, so a name edit cannot re-activate a stale season. */
export function changedFields<T extends object>(
  original: T,
  next: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => original[key as keyof T] !== value,
    ),
  ) as Partial<T>;
}
