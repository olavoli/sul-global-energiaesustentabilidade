import { portugueseTaxonomyAlternates } from "@/content/taxonomy-topics";
import { siteConfig } from "@/config/site";
import { resolveCanonical, socialMeta } from "./seo";

interface TopicMetadata {
  name: string;
  slug: string;
  indexable: boolean;
}

export function tagPageHead(
  topic: TopicMetadata | undefined,
  indexingEnabled = siteConfig.indexingEnabled,
) {
  if (!topic) {
    return {
      meta: [
        { title: "Tema não encontrado — Sul Global" },
        { name: "robots", content: indexingEnabled ? "noindex, follow" : "noindex, nofollow" },
      ],
    };
  }
  const title = `${topic.name} — Temas — Sul Global`;
  const description = `Artigos do Sul Global sobre ${topic.name}. Explore análises e explicações relacionadas a este tema.`;
  const path = `/tag/${topic.slug}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: !indexingEnabled
          ? "noindex, nofollow"
          : topic.indexable
            ? "index, follow"
            : "noindex, follow",
      },
      ...socialMeta({ title, description, path }),
    ],
    links: [
      { rel: "canonical", href: resolveCanonical(path) },
      ...(topic.indexable
        ? portugueseTaxonomyAlternates("tag", topic.name).map((l) => ({
            rel: "alternate",
            hrefLang: l.locale,
            href: resolveCanonical(l.path),
          }))
        : []),
    ],
  };
}
