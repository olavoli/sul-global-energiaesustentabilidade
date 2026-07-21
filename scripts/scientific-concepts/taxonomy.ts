import { readFile } from "node:fs/promises";
import { z } from "zod";

const entrySchema = z.object({
  id: z.string().regex(/^concept-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().min(1),
  aliases: z.array(z.string().min(1)).min(1),
  category: z.string().min(1),
  themeId: z.string().min(1),
  relations: z.array(z.string()),
});
const taxonomySchema = z.object({
  schemaVersion: z.literal(1),
  taxonomyVersion: z.string().min(1),
  concepts: z.array(entrySchema),
});
export type ConceptTaxonomy = z.infer<typeof taxonomySchema>;

export function normalizeConceptTerm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function validateTaxonomy(value: unknown): ConceptTaxonomy {
  const taxonomy = taxonomySchema.parse(value);
  const ids = new Set(taxonomy.concepts.map(({ id }) => id));
  const aliases = new Map<string, string>();
  for (const concept of taxonomy.concepts) {
    for (const candidate of [concept.label, ...concept.aliases]) {
      const normalized = normalizeConceptTerm(candidate);
      const owner = aliases.get(normalized);
      if (owner && owner !== concept.id) throw new Error(`Alias ambíguo: ${candidate}`);
      aliases.set(normalized, concept.id);
    }
    for (const target of concept.relations)
      if (!ids.has(target)) throw new Error(`Relação aponta para conceito ausente: ${target}`);
  }
  return taxonomy;
}

export async function loadConceptTaxonomy(): Promise<ConceptTaxonomy> {
  const body = await readFile(
    new URL("../../newsroom/policies/scientific-concepts.json", import.meta.url),
    "utf8",
  );
  return validateTaxonomy(JSON.parse(body));
}

export function exactConcept(taxonomy: ConceptTaxonomy, value: string) {
  const normalized = normalizeConceptTerm(value);
  return taxonomy.concepts.find((entry) =>
    [entry.label, ...entry.aliases].some((alias) => normalizeConceptTerm(alias) === normalized),
  );
}
