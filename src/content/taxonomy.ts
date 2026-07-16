export const canonicalTags = [
  "aneel",
  "armazenamento",
  "ásia",
  "áfrica",
  "biomassa",
  "brasil",
  "eficiência energética",
  "energia eólica",
  "energia nuclear",
  "energia solar",
  "hidrogênio",
  "mercado de carbono",
  "mme",
  "mudanças climáticas",
  "ons",
  "redes elétricas",
  "américa latina",
  "união europeia",
] as const;

const tagAliases: Readonly<Record<string, string>> = {
  eolica: "energia eólica",
  "energia eolica": "energia eólica",
  hidrogenio: "hidrogênio",
  nuclear: "energia nuclear",
  solar: "energia solar",
  "smart grid": "redes elétricas",
};

/** Normalize spacing and casing without silently changing editorial meaning. */
export function normalizeEditorialTag(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

/** Return the preferred form for a known equivalent tag. */
export function preferredEditorialTag(value: string): string {
  const normalized = normalizeEditorialTag(value);
  return tagAliases[normalized] ?? normalized;
}

export function tagNeedsNormalization(value: string): boolean {
  return preferredEditorialTag(value) !== value;
}
