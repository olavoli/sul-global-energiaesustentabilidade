import type { CrossrefWork, OpenAlexWork } from "./sources";
import { normalizeDoi, reconstructAbstract } from "./sources";
import { classifyScientificWork, relatedExistingCategories } from "./taxonomy";
import { scoreScientificWork } from "./scoring";
import { scientificWorkSchema, type ScientificWork } from "./contracts";
import { detectScientificWarnings } from "./warnings";

function unique(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)),
    ),
  ];
}

function plainAbstract(value: string | null | undefined): string | null {
  if (!value) return null;
  const stripped = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || null;
}

async function stableId(prefix: "radar" | "dossier", value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hex = [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}-${hex}`;
}

export async function normalizeScientificWork(
  openAlex: OpenAlexWork,
  crossref: CrossrefWork,
  now: Date,
): Promise<ScientificWork | undefined> {
  if (!openAlex.doi) return undefined;
  const doi = normalizeDoi(openAlex.doi);
  const abstract =
    reconstructAbstract(openAlex.abstract_inverted_index) ?? plainAbstract(crossref.abstract);
  const keywords = unique([
    ...openAlex.keywords.map(({ display_name }) => display_name),
    ...crossref.subject,
  ]);
  const topics = openAlex.topics.map(({ display_name }) => display_name);
  const classified = classifyScientificWork({ title: openAlex.title, abstract, keywords, topics });
  if (!classified.length) return undefined;
  const categories = classified.map(({ category }) => category);
  const existingCategorySlugs = relatedExistingCategories(categories);
  const journal =
    openAlex.primary_location?.source?.display_name ?? crossref["container-title"][0] ?? null;
  const license =
    openAlex.best_oa_location?.license ??
    openAlex.primary_location?.license ??
    crossref.license[0]?.URL ??
    null;
  const openAccess = Boolean(
    openAlex.open_access?.is_oa ??
    openAlex.best_oa_location?.is_oa ??
    openAlex.primary_location?.is_oa ??
    false,
  );
  const discoveredAt = now.toISOString();
  const score = scoreScientificWork({
    publicationDate: openAlex.publication_date,
    citedByCount: Math.max(openAlex.cited_by_count, crossref["is-referenced-by-count"] ?? 0),
    journal,
    crossrefValidated: true as const,
    openAccess,
    categoryMatches: classified.reduce((total, entry) => total + entry.matches, 0),
    categories,
    existingCategorySlugs,
    now,
  });
  const base = {
    id: await stableId("radar", doi),
    openAlexId: openAlex.id,
    doi,
    title: openAlex.title,
    authors: unique([
      ...openAlex.authorships.map(({ author }) => author.display_name),
      ...crossref.author.map(({ given, family }) => [given, family].filter(Boolean).join(" ")),
    ]),
    institutions: unique([
      ...openAlex.authorships.flatMap(({ institutions }) =>
        institutions.map(({ display_name }) => display_name),
      ),
      ...crossref.author.flatMap(({ affiliation }) => affiliation.map(({ name }) => name)),
    ]),
    countries: unique(
      openAlex.authorships.flatMap(({ institutions }) =>
        institutions.map(({ country_code }) => country_code),
      ),
    ),
    abstract,
    keywords,
    journal,
    publisher:
      openAlex.primary_location?.source?.host_organization_name ?? crossref.publisher ?? null,
    publicationDate: openAlex.publication_date,
    license,
    openAccess,
    openAccessUrl:
      openAlex.best_oa_location?.landing_page_url ?? openAlex.best_oa_location?.pdf_url ?? null,
    type: crossref.type ?? openAlex.type,
    peerReviewStatus:
      (crossref.type ?? openAlex.type) === "journal-article"
        ? ("probable" as const)
        : ("unknown" as const),
    corrected: false,
    retracted: false,
    area:
      openAlex.primary_topic?.field?.display_name ?? openAlex.primary_topic?.display_name ?? null,
    categories,
    existingCategorySlugs,
    citedByCount: Math.max(openAlex.cited_by_count, crossref["is-referenced-by-count"] ?? 0),
    referencedWorks: unique(openAlex.referenced_works),
    relatedWorks: unique(openAlex.related_works),
    officialLinks: {
      openAlex: openAlex.id,
      doi: `https://doi.org/${doi}`,
      crossref: `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    },
    crossrefValidated: true as const,
    warningVersion: 1 as const,
    score,
    status: "new",
    discoveredAt,
    updatedAt: discoveredAt,
    history: [{ action: "discovered", actor: "scientific-radar", note: "", at: discoveredAt }],
  };
  return scientificWorkSchema.parse({
    ...base,
    warnings: detectScientificWarnings(base, discoveredAt),
  });
}

export async function scientificDossierId(scientificWorkId: string): Promise<string> {
  return stableId("dossier", scientificWorkId);
}
