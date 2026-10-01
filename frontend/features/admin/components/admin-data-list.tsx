import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/state";

export function AdminListLoading() {
  return (
    <Card
      className="space-y-3 p-5"
      role="status"
      aria-label="Loading management list"
    >
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} className="h-20 w-full" />
      ))}
    </Card>
  );
}

export function AdminDataList<T extends { id: string }>({
  items,
  columns,
  actions,
  name,
}: {
  items: T[];
  columns: { label: string; render: (item: T) => ReactNode }[];
  actions: (item: T) => ReactNode;
  name: string;
}) {
  return (
    <>
      <Card className="hidden lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{name}</caption>
          <thead className="border-b border-border bg-surface-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.label} scope="col" className="px-4 py-3">
                  {column.label}
                </th>
              ))}
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                {columns.map((column) => (
                  <td
                    key={column.label}
                    className="break-words px-4 py-4 align-top"
                  >
                    {column.render(item)}
                  </td>
                ))}
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-wrap gap-2">{actions(item)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-3 lg:hidden" aria-label={name}>
        {items.map((item) => (
          <Card key={item.id} className="space-y-4 p-4">
            <dl className="space-y-3">
              {columns.map((column) => (
                <div key={column.label} className="min-w-0">
                  <dt className="text-xs font-semibold text-muted-foreground">
                    {column.label}
                  </dt>
                  <dd className="mt-1 break-words text-sm">
                    {column.render(item)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">{actions(item)}</div>
          </Card>
        ))}
      </div>
    </>
  );
}
