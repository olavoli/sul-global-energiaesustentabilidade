import type { CorrectionEntry } from "@/content/schema";

/** Show reader-facing update and correction history without internal notes. */
export function EditorialHistory({
  updateNote,
  corrections,
}: {
  updateNote?: string;
  corrections: CorrectionEntry[];
}) {
  if (!updateNote && corrections.length === 0) return null;
  return (
    <aside
      className="mt-8 rounded-md border border-border bg-muted/40 p-5"
      aria-labelledby="history-title"
    >
      <h2 id="history-title" className="font-serif text-xl font-semibold">
        Atualizações e correções
      </h2>
      {updateNote && <p className="mt-3 text-sm">{updateNote}</p>}
      {corrections.length > 0 && (
        <ul className="mt-3 space-y-3 text-sm">
          {corrections.map((entry) => (
            <li key={`${entry.date}-${entry.type}-${entry.reason}`}>
              <strong>{entry.type === "correction" ? "Correção" : "Atualização"}</strong>
              {` — ${entry.date}: ${entry.description}`}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
