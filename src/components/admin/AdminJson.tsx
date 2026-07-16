import type { ReactNode } from "react";

function label(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
}

function Value({ value, depth = 0 }: { value: unknown; depth?: number }): ReactNode {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value))
      return (
        <a href={value} target="_blank" rel="noreferrer" className="text-primary underline">
          {value}
        </a>
      );
    return value;
  }
  if (typeof value === "number") return new Intl.NumberFormat("pt-BR").format(value);
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-muted-foreground">Nenhum</span>;
    return (
      <ul className="space-y-2">
        {value.map((entry, index) => (
          <li key={index} className="rounded-md border p-3">
            <Value value={entry} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <dl className={depth ? "space-y-2" : "grid gap-4 md:grid-cols-2"}>
        {Object.entries(value).map(([key, entry]) => (
          <div key={key} className="min-w-0 rounded-md border bg-card p-3">
            <dt className="overline text-muted-foreground">{label(key)}</dt>
            <dd className="mt-1 break-words text-sm">
              <Value value={entry} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return String(value);
}

export function AdminJson({ value }: { value: unknown }) {
  return <Value value={value} />;
}
