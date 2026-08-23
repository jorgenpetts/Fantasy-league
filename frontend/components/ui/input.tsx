import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ id, label, error, className, required, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={inputId ? `${inputId}-error` : undefined} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
