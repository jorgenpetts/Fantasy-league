"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  defaultValue?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function Select({
  label,
  error,
  options,
  placeholder = "Select an option",
  required,
  disabled,
  value,
  defaultValue,
  name,
  onValueChange,
  className,
  ariaLabel,
}: SelectProps) {
  const id = React.useId();

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      <SelectPrimitive.Root
        name={name}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onValueChange={onValueChange}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-border bg-surface px-3 text-sm text-foreground shadow-sm transition-colors",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground",
            "data-[placeholder]:text-muted-foreground/70",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 text-muted-foreground" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-card border border-border bg-surface text-foreground shadow-soft"
            position="popper"
            sideOffset={6}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none focus:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <span className="absolute left-2 flex size-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
