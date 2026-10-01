"use client";

import { PageContainer, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <PageContainer>
      <PageHeader title="Account" description="Your fantasy league account details." />
      <Card><CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="text-sm text-muted-foreground">Name</dt><dd className="font-semibold">{user?.name}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Email</dt><dd className="break-all font-semibold">{user?.email}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Role</dt><dd className="font-semibold">{user?.role === "ADMIN" ? "Administrator" : "Manager"}</dd></div>
        </dl>
      </CardContent></Card>
    </PageContainer>
  );
}
