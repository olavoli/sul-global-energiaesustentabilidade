import { Link } from "@tanstack/react-router";

export function ResearchWorkspaceLinks({ entries }: { entries: unknown[] }) {
  const ids = [
    ...new Set(
      entries.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const id = (entry as Record<string, unknown>).workspaceWorkId;
        return typeof id === "string" && /^radar-[a-f0-9]{16}$/.test(id) ? [id] : [];
      }),
    ),
  ];
  if (!ids.length) return null;
  return (
    <nav aria-label="Workspaces de pesquisa relacionados" className="mb-4 flex flex-wrap gap-3">
      {ids.map((scientificWorkId) => (
        <Link
          key={scientificWorkId}
          to="/admin/research-workspace/$scientificWorkId"
          params={{ scientificWorkId }}
          className="rounded border bg-background px-3 py-2 text-sm text-primary underline underline-offset-4"
        >
          Abrir Workspace relacionado
        </Link>
      ))}
    </nav>
  );
}
