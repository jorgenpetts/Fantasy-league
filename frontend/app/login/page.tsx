"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage, isValidEmail } from "@/lib/form-errors";
import { getSafeNextPath } from "@/lib/routes";
import { useAuth } from "@/hooks/use-auth";

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refreshUser, isLoggingIn } = useAuth();
  const [errors, setErrors] = useState<LoginErrors>({});
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: LoginErrors = {};

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await login({ email, password });
      await refreshUser();
      router.replace(nextPath);
    } catch (error) {
      setErrors({
        form: getApiErrorMessage(error, "Incorrect email or password."),
      });
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in with your club fantasy account to manage your team."
      footer={{
        text: "No account yet?",
        href: "/register",
        label: "Register",
      }}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {errors.form ? (
          <div
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {errors.form}
          </div>
        ) : null}
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          error={errors.password}
        />
        <Button type="submit" className="w-full" isLoading={isLoggingIn} icon={<Mail />}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
