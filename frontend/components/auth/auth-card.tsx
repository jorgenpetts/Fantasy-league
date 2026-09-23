import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: {
    text: string;
    href: string;
    label: string;
  };
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                ECC Fantasy League
              </p>
              <p className="text-sm text-muted-foreground">Cricket fantasy manager</p>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-6">{children}</div>
          <p className="mt-5 text-sm text-muted-foreground">
            {footer.text}{" "}
            <Link className="font-semibold text-primary hover:underline" href={footer.href}>
              {footer.label}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
