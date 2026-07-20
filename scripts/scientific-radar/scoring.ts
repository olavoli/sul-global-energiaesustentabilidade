import type { ScientificCategory } from "./contracts";

export function scoreScientificWork(input: {
  publicationDate: string;
  citedByCount: number;
  journal: string | null;
  crossrefValidated: boolean;
  openAccess: boolean;
  categoryMatches: number;
  categories: ScientificCategory[];
  existingCategorySlugs: string[];
  now: Date;
}) {
  const ageDays = Math.max(
    0,
    Math.floor((input.now.valueOf() - Date.parse(input.publicationDate)) / 86_400_000),
  );
  const recency =
    ageDays <= 30 ? 25 : ageDays <= 90 ? 20 : ageDays <= 180 ? 14 : ageDays <= 365 ? 8 : 2;
  const citations = Math.min(20, Math.round(Math.log10(input.citedByCount + 1) * 10));
  const journal = input.journal ? (input.crossrefValidated ? 15 : 8) : 0;
  const openAccess = input.openAccess ? 10 : 0;
  const thematic = Math.min(20, input.categoryMatches * 5);
  const categoryRelationship = Math.min(
    10,
    input.categories.length * 2 + Math.max(0, input.existingCategorySlugs.length - 1),
  );
  return {
    total: recency + citations + journal + openAccess + thematic + categoryRelationship,
    recency,
    citations,
    journal,
    openAccess,
    thematic,
    categoryRelationship,
  };
}
