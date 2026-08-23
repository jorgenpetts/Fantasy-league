"use client";

import { Toaster, toast } from "sonner";
import type { ReactNode } from "react";

type ToastVariant = "success" | "error" | "info" | "warning";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "8px",
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return {
    showToast: ({ title, description, variant = "info" }: ToastInput) => {
      toast[variant](title, { description });
    },
  };
}
