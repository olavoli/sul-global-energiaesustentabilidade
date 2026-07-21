import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminEmpty } from "./AdminStates";
import { filterScientificConcepts, type ConceptView } from "./scientific-concept-filter";
import {
  conceptRelationSchema,
  conceptSchema,
} from "../../../scripts/scientific-concepts/contracts";

export function AdminScientificConcepts({ entries: rawEntries }: { entries: unknown[] }) {
  const entries: ConceptView[] = rawEntries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const concept = conceptSchema.safeParse(record);
    const relations = conceptRelationSchema.array().safeParse(record.relations);
    return concept.success && relations.success
      ? [{ ...concept.data, relations: relations.data }]
      : [];
  });
  const [filters, setFilters] = useState({
    term: "",
    category: "all",
    status: "all",
    relationType: "all",
  });
  const categories = [...new Set(entries.map(({ category }) => category))].sort();
  const filtered = filterScientificConcepts(entries, filters);
  if (!entries.length) return <AdminEmpty message="Nenhum conceito científico persistido." />;
  const select = (label: string, key: "category" | "status" | "relationType", values: string[]) => (
    <label className="text-sm font-medium">
      {label}
      <select
        className="mt-2 h-10 w-full rounded-md border bg-background px-3"
        value={filters[key]}
        onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}
      >
        <option value="all">Todos</option>
        {values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-medium">
          Busca
          <Input
            className="mt-2"
            value={filters.term}
            onChange={(event) =>
              setFilters((current) => ({ ...current, term: event.target.value }))
            }
          />
        </label>
        {select("Categoria", "category", categories)}
        {select("Revisão", "status", ["pending", "accepted", "rejected", "ignored"])}
        {select("Relação", "relationType", [
          "paper-concept",
          "concept-concept",
          "concept-theme",
          "concept-timeline",
          "concept-dossier",
        ])}
      </div>
      {filtered.map((entry) => (
        <article key={entry.id} className="rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{entry.label}</strong>
            <Badge>{entry.category}</Badge>
            <Badge variant="secondary">confiança {entry.confidence}</Badge>
            {entry.relations[0] && (
              <Link
                className="ml-auto text-primary underline"
                to="/admin/newsroom/$section/$id"
                params={{ section: "scientific-concepts", id: entry.relations[0].id }}
              >
                Revisar relação
              </Link>
            )}
          </div>
          <p className="mt-2 text-sm">
            <strong>Aliases:</strong> {entry.aliases.join(" · ")}
          </p>
          <p className="mt-2 text-sm">
            <strong>Artigos relacionados:</strong>{" "}
            {entry.relations.filter(({ type }) => type === "paper-concept").length}
          </p>
          <p className="mt-2 text-sm">
            <strong>Evolução temporal:</strong>{" "}
            {entry.relations
              .filter(({ type }) => type === "concept-timeline")
              .map(({ to }) => to)
              .join(" · ") || "sem observação"}
          </p>
          <p className="mt-2 text-sm">
            <strong>Relações observadas:</strong> {entry.relations.length}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {entry.relations.map((relation) => (
              <li key={relation.id}>
                <Link
                  className="text-primary underline"
                  to="/admin/newsroom/$section/$id"
                  params={{ section: "scientific-concepts", id: relation.id }}
                >
                  {relation.type}: {relation.from} → {relation.to} ({relation.humanStatus})
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ))}
      {!filtered.length && <AdminEmpty message="Nenhum conceito corresponde aos filtros." />}
    </div>
  );
}
