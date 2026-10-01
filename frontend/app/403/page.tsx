import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="403"
        title="Not authorised"
        description="Your account does not have access to the admin area."
      />
      <Button asChild>
        <Link href="/">Back to Fantasy App</Link>
      </Button>
    </PageContainer>
  );
}
