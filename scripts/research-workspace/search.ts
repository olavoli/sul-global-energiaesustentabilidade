import type { ScientificWork } from "../scientific-radar/contracts";

function searchable(work: ScientificWork): string {
  return [
    work.doi,
    work.title,
    ...work.authors,
    ...work.institutions,
    ...work.categories,
    work.journal ?? "",
    work.publicationDate.slice(0, 4),
  ]
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function searchResearchWorks(works: ScientificWork[], query: string): ScientificWork[] {
  const terms = query
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return works;
  return works.filter((work) => {
    const value = searchable(work);
    return terms.every((term) => value.includes(term));
  });
}
