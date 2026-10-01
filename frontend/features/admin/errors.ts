import { ApiError } from "@/lib/api";
import type { FieldErrors } from "./types";

export function adminMutationErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError))
    return {
      form: "Unable to save changes. Check your connection and try again.",
    };
  if (error.status === 403)
    return { form: "You no longer have permission to make this change." };
  if (error.status === 401) return { form: "Please log in again." };
  if (error.status === 409 && error.message.includes("number already exists"))
    return {
      roundNumber: "A round with this number already exists for this season.",
      form: "A round with this number already exists for this season.",
    };
  if (error.status === 409) return { form: error.message };
  if (error.status === 404)
    return {
      form: "This record is no longer available. Close the form and refresh the list.",
    };
  if (error.status === 400) {
    const fields: FieldErrors = {};
    const issues = error.payload?.issues;
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (
          issue &&
          Array.isArray(issue.path) &&
          typeof issue.path[0] === "string"
        ) {
          const field = issue.path[0];
          const messages: Record<string, string> = {
            firstName: "Enter a first name of up to 80 characters.",
            lastName: "Enter a last name of up to 80 characters.",
            name: "Enter a name of up to 120 characters.",
            price: "Enter a positive whole ZAR amount.",
            position: "Choose a valid position.",
            startDate: "Enter a valid start date.",
            endDate: "End date must be valid and on or after start date.",
            deadline: "Enter a valid date and time.",
            roundNumber: "Enter a positive whole round number.",
            seasonId: "Choose a valid season.",
            status: "Choose a valid round status.",
          };
          if (messages[field]) fields[field] = messages[field];
        }
      }
    }
    if (error.message === "endDate must be on or after startDate.")
      fields.endDate = "End date must be on or after start date.";
    return {
      ...fields,
      form: "Please check the highlighted fields and try again.",
    };
  }
  return { form: "Unable to save changes. Please try again in a moment." };
}
