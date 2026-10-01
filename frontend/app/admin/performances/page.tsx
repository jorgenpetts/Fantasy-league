import { Suspense } from "react";
import { PerformancePage } from "@/features/admin/performances/performance-page";
import { AdminListLoading } from "@/features/admin/components/admin-data-list";

export default function AdminPerformancesPage() {
  return <Suspense fallback={<AdminListLoading />}><PerformancePage /></Suspense>;
}
