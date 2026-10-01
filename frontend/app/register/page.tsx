"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage, isValidEmail } from "@/lib/form-errors";
import { getSafeNextPath } from "@/lib/routes";
import { useAuth } from "@/hooks/use-auth";

type RegisterErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isRegistering } = useAuth();
  const [errors, setErrors] = useState<RegisterErrors>({});
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRegistering) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const nextErrors: RegisterErrors = {};

    if (!name) {
      nextErrors.name = "Name is required.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await register({ name, email, password });
      router.replace(nextPath);
    } catch (error) {
      setErrors({
        form: getApiErrorMessage(error, "Registration failed."),
      });
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Register with your name, email, and password to join the league."
      footer={{
        text: "Already registered?",
        href: "/login",
        label: "Login",
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
          label="Name"
          name="name"
          placeholder="Your name"
          autoComplete="name"
          error={errors.name}
          required
        />
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
          autoComplete="new-password"
          error={errors.password}
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />
        <Button
          type="submit"
          className="w-full"
          isLoading={isRegistering}
          icon={<UserPlus />}
        >
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
