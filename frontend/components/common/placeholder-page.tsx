import type { ReactNode } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { EmptyState } from "@/components/ui/state";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <PageContainer>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {children ?? (
        <EmptyState
          title="Ready for the next frontend step"
          description="This route exists so the application shell, navigation, and responsive structure can be tested before feature screens are built."
        />
      )}
    </PageContainer>
  );
}
