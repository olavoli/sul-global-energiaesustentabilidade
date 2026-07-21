import type { Concept, ConceptRelation } from "../../../scripts/scientific-concepts/contracts";

export interface ConceptView extends Concept {
  relations: ConceptRelation[];
}
export function filterScientificConcepts(
  entries: ConceptView[],
  filters: { term: string; category: string; status: string; relationType: string },
) {
  const term = filters.term.trim().toLocaleLowerCase("en");
  return entries.filter((entry) => {
    const searchable = [entry.id, entry.label, ...entry.aliases].join(" ").toLocaleLowerCase("en");
    return (
      (!term || searchable.includes(term)) &&
      (filters.category === "all" || entry.category === filters.category) &&
      (filters.status === "all" ||
        entry.relations.some(({ humanStatus }) => humanStatus === filters.status)) &&
      (filters.relationType === "all" ||
        entry.relations.some(({ type }) => type === filters.relationType))
    );
  });
}
