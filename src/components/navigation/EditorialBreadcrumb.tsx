import type { ReactNode } from "react";

/** Display a compact semantic breadcrumb without imposing route-specific link types. */
export function EditorialBreadcrumb({
  items,
  current,
}: {
  items: Array<{ label: string; content: ReactNode }>;
  current: string;
}) {
  return (
    <nav aria-label="Navegação estrutural" className="mb-5 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            {item.content}
            <span aria-hidden>/</span>
          </li>
        ))}
        <li aria-current="page" className="max-w-full truncate text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}
