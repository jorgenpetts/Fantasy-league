import { ApiError } from "@/lib/api";
import { statFields, type PerformanceInput, type RowErrors } from "./model";

export function performanceError(
  error: unknown,
  rows: PerformanceInput[] = [],
) {
  const fields: RowErrors = {};
  let message =
    "Unable to save performances. Your unsaved changes are still here. Please try again.";
  if (error instanceof ApiError) {
    if (error.status === 403)
      message = "You are not authorised to modify performances.";
    else if (error.status === 401) message = "Please log in again.";
    else if (error.status === 404)
      message =
        "The round or one of its players no longer exists. Refresh the list before trying again.";
    else if (error.status === 400) {
      message =
        "Unable to save performances. Review the highlighted fields and try again.";
      if (Array.isArray(error.payload?.issues)) {
        for (const issue of error.payload.issues) {
          if (!issue || !Array.isArray(issue.path)) continue;
          const [root, index, field] = issue.path;
          const row =
            root === "performances" && Number.isInteger(index)
              ? rows[index]
              : undefined;
          if (!row) continue;
          const stat = statFields.find(({ key }) => key === field);
          fields[row.playerId] ??= {};
          if (stat)
            fields[row.playerId][stat.key] =
              `${stat.label} must be a non-negative whole number.`;
          else
            fields[row.playerId].row =
              "Review this player’s performance values.";
        }
      }
    }
  }
  return { message, fields };
}
