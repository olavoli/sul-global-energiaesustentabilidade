export function normalizeEntityName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeExternalId(kind: string, value: string): string {
  const clean = value.trim().toLocaleLowerCase("en");
  if (kind === "doi") return clean.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "");
  if (kind === "orcid") return clean.replace(/^https?:\/\/orcid\.org\//, "");
  if (kind === "ror") return clean.replace(/^https?:\/\/ror\.org\//, "");
  if (kind === "openalex") return clean.replace(/^https?:\/\/openalex\.org\//, "");
  return clean.replace(/[^a-z0-9]/g, "");
}
