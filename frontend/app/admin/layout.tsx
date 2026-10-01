import type { ReactNode } from "react";
import { AdminNavigationProvider } from "@/features/admin/performances/navigation-guard";
import { AdminShell } from "@/features/admin/components/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminNavigationProvider><AdminShell>{children}</AdminShell></AdminNavigationProvider>;
}
