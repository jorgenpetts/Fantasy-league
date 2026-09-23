import { Badge } from "@/components/ui/badge";

export function TransferPlayerList({
  title,
  ids,
  names,
}: {
  title: string;
  ids: string[];
  names: Map<string, string>;
}) {
  if (ids.length === 0) return null;

  const knownNames = ids.map((id) => names.get(id)).filter(Boolean) as string[];

  return (
    <div>
      <p className="text-xs font-bold uppercase text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {knownNames.length > 0 ? (
          knownNames.map((name, index) => (
            <Badge key={`${title}-${index}-${name}`}>{name}</Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">
            {ids.length} player{ids.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}
