import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 min-w-0 max-w-full whitespace-normal rounded-md border text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-surface-muted bg-surface-muted text-foreground hover:bg-border",
        outline:
          "border-border bg-transparent text-foreground hover:bg-surface-muted",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-surface-muted",
        danger: "border-danger bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "min-h-11 px-3 py-2",
        md: "min-h-11 px-4 py-2",
        lg: "min-h-11 px-5 py-2 text-base",
        icon: "size-11 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
    icon?: React.ReactNode;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" /> : icon}
      <Slottable>
        {size === "icon" && !asChild ? (
          <span className="sr-only">{children}</span>
        ) : (
          children
        )}
      </Slottable>
    </Comp>
  );
}
