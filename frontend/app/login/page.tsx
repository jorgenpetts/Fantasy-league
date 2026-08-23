import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardContent>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            ECC Fantasy League
          </p>
          <h1 className="mt-2 text-2xl font-bold">Login</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Form behaviour will be wired in the auth step.
          </p>
          <form className="mt-6 space-y-4">
            <Input label="Email" type="email" name="email" placeholder="you@example.com" />
            <Input label="Password" type="password" name="password" />
            <Button type="button" className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted-foreground">
            No account yet?{" "}
            <Link className="font-semibold text-primary hover:underline" href="/register">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
