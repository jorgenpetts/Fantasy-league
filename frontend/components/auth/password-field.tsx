"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordField({
  label,
  name,
  error,
  autoComplete,
}: {
  label: string;
  name: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        label={label}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        error={error}
        required
        className="pr-12"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute bottom-0 right-0 border-transparent text-muted-foreground"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff /> : <Eye />}
        {visible ? "Hide password" : "Show password"}
      </Button>
    </div>
  );
}
