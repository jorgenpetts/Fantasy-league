import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cricket Fantasy League",
  description: "A local-club fantasy cricket league application.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
