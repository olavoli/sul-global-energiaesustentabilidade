import { categories } from "../data/categories";
import type { ContentLocale } from "./translation-schema";
import tags1 from "../data/taxonomy-tags-1";
import tags2 from "../data/taxonomy-tags-2";
import tags3 from "../data/taxonomy-tags-3";
import tags4 from "../data/taxonomy-tags-4";
import tags5 from "../data/taxonomy-tags-5";
import tags6 from "../data/taxonomy-tags-6";

export const taxonomyLocales = ["pt-BR", "en", "es"] as const;
export type TaxonomyKind = "category" | "tag";
export interface TaxonomyTerm {
  id: string;
  kind: TaxonomyKind;
  sourceKey: string;
  editions: Record<ContentLocale, { label: string; slug: string; description: string }>;
}
const categoryLabels: Record<string, readonly [string, string, string, string, string, string]> = {
  energia: [
    "Energy",
    "energy",
    "Electricity markets, infrastructure and regulation in Brazil and worldwide.",
    "Energía",
    "energia",
    "Mercados eléctricos, infraestructura y regulación en Brasil y el mundo.",
  ],
  sustentabilidade: [
    "Sustainability",
    "sustainability",
    "Climate, biodiversity and the real cost of the low-carbon economy.",
    "Sostenibilidad",
    "sostenibilidad",
    "Clima, biodiversidad y el costo real de la economía baja en carbono.",
  ],
  ciencia: [
    "Science",
    "science",
    "Applied research, peer-reviewed publications and new frontiers in energy physics.",
    "Ciencia",
    "ciencia",
    "Investigación aplicada, publicaciones revisadas por pares y nuevas fronteras de la física de la energía.",
  ],
  tecnologia: [
    "Technology",
    "technology",
    "Hardware, software and engineering behind the energy transition.",
    "Tecnología",
    "tecnologia",
    "Hardware, software e ingeniería detrás de la transición energética.",
  ],
  desenvolvimento: [
    "Development",
    "development",
    "Public policy, financing and economic growth with clean energy.",
    "Desarrollo",
    "desarrollo",
    "Políticas públicas, financiación y crecimiento económico con energía limpia.",
  ],
  "transicao-energetica": [
    "Energy transition",
    "energy-transition",
    "The geopolitics, capital and engineering of the transition to a low-carbon energy system.",
    "Transición energética",
    "transicion-energetica",
    "La geopolítica, el capital y la ingeniería de la transición hacia un sistema energético bajo en carbono.",
  ],
  "politicas-publicas": [
    "Public policy",
    "public-policy",
    "Public policy, public health, financing and Brazilian institutions.",
    "Políticas públicas",
    "politicas-publicas",
    "Políticas públicas, salud colectiva, financiación e instituciones brasileñas.",
  ],
  funcional: [
    "Practical knowledge",
    "practical-knowledge",
    "Traditional knowledge, techniques and practical solutions examined with context, cultural respect and technical insight.",
    "Saberes prácticos",
    "saberes-practicos",
    "Saberes populares, técnicas tradicionales y soluciones prácticas analizadas con contexto, respeto cultural y perspectiva técnica.",
  ],
};
/** Same slug rule as the public Portuguese tag routes; identifiers are not model output. */
export function taxonomySlug(value: string) {
  const result = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!result) throw Error(`Tag sem slug navegável: ${value}`);
  return result;
}
const topicDescription = (label: string, locale: ContentLocale) =>
  locale === "en"
    ? `Sul Global articles about ${label}. Explore related analysis and explanations.`
    : locale === "es"
      ? `Artículos de Sul Global sobre ${label}. Explore análisis y explicaciones relacionados.`
      : `Artigos do Sul Global sobre ${label}. Explore análises e explicações relacionadas a este tema.`;
export const taxonomyCatalog: readonly TaxonomyTerm[] = [
  ...categories.map((c): TaxonomyTerm => {
    const [en, enSlug, enDescription, es, esSlug, esDescription] = categoryLabels[c.slug];
    return {
      id: `category:${c.slug}`,
      kind: "category",
      sourceKey: c.slug,
      editions: {
        "pt-BR": { label: c.name, slug: c.slug, description: c.description },
        en: { label: en, slug: enSlug, description: enDescription },
        es: { label: es, slug: esSlug, description: esDescription },
      },
    };
  }),
  ...[...tags1, ...tags2, ...tags3, ...tags4, ...tags5, ...tags6].map(
    ([id, pt, en, enSlug, es, esSlug]): TaxonomyTerm => ({
      id: `tag:${id}`,
      kind: "tag",
      sourceKey: pt,
      editions: {
        "pt-BR": { label: pt, slug: id, description: topicDescription(pt, "pt-BR") },
        en: { label: en, slug: enSlug, description: topicDescription(en, "en") },
        es: { label: es, slug: esSlug, description: topicDescription(es, "es") },
      },
    }),
  ),
];
/** Fail closed on unknown source terms; translation cannot invent classification. */
export function sourceTerm(kind: TaxonomyKind, key: string) {
  const term = taxonomyCatalog.find((t) => t.kind === kind && t.sourceKey === key);
  if (!term) throw Error("taxonomy-unregistered-source-term");
  return term;
}
export function taxonomyPath(term: TaxonomyTerm, locale: ContentLocale) {
  const segment =
    term.kind === "category"
      ? locale === "en"
        ? "category"
        : "categoria"
      : locale === "es"
        ? "tema"
        : "tag";
  return `${locale === "pt-BR" ? "" : "/" + locale}/${segment}/${term.editions[locale].slug}`;
}
export function findTaxonomyTerm(kind: TaxonomyKind, locale: ContentLocale, slug: string) {
  return taxonomyCatalog.find((t) => t.kind === kind && t.editions[locale].slug === slug);
}
/** Validate IDs, labels and slugs per namespace/language; no free synonyms. */
export function validateTaxonomy(catalog: readonly TaxonomyTerm[] = taxonomyCatalog) {
  const ids = new Set<string>(),
    keys = new Set<string>(),
    slugs = new Set<string>(),
    labels = new Set<string>();
  for (const t of catalog) {
    if (
      ids.has(t.id) ||
      keys.has(`${t.kind}:${t.sourceKey}`) ||
      t.id !== `${t.kind}:${t.editions["pt-BR"].slug}`
    )
      throw Error("taxonomy-duplicate-or-unstable-id");
    ids.add(t.id);
    keys.add(`${t.kind}:${t.sourceKey}`);
    for (const locale of taxonomyLocales) {
      const e = t.editions[locale];
      if (!e?.label.trim() || !e.description.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug))
        throw Error("taxonomy-invalid-edition");
      const slugKey = `${t.kind}:${locale}:${e.slug}`,
        labelKey = `${t.kind}:${locale}:${e.label.toLocaleLowerCase(locale)}`;
      if (slugs.has(slugKey) || labels.has(labelKey)) throw Error("taxonomy-localized-collision");
      slugs.add(slugKey);
      labels.add(labelKey);
    }
  }
}
/** Translations keep the exact source bindings, including order, without writing localized labels into MDX. */
export function validateTranslationTaxonomy(
  source: { category: string; tags: readonly string[] },
  target: { category: string; tags: readonly string[] },
) {
  validateTaxonomy();
  if (
    source.category !== target.category ||
    JSON.stringify(source.tags) !== JSON.stringify(target.tags)
  )
    throw Error("taxonomy-source-classification-changed");
  sourceTerm("category", target.category);
  if (new Set(target.tags).size !== target.tags.length)
    throw Error("taxonomy-duplicate-membership");
  for (const tag of target.tags) sourceTerm("tag", tag);
}
