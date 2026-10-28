import { portugueseTaxonomyAlternates } from "@/content/taxonomy-topics";
import { siteConfig } from "@/config/site";
import type { Category } from "@/types/content";
import { categoryBreadcrumb, resolveCanonical, socialMeta } from "./seo";

export function isCategoryIndexable(articleCount: number): boolean {
  return articleCount > 0;
}

export function categoryPageHead(
  category: Category,
  articleCount: number,
  indexingEnabled = siteConfig.indexingEnabled,
) {
  return {
    meta: [
      { title: `${category.name} — Sul Global` },
      { name: "description", content: category.description },
      ...(!indexingEnabled
        ? [{ name: "robots", content: "noindex, nofollow" }]
        : !isCategoryIndexable(articleCount)
          ? [{ name: "robots", content: "noindex, follow" }]
          : []),
      ...socialMeta({
        title: `${category.name} — Sul Global`,
        description: category.description,
        path: `/categoria/${category.slug}`,
      }),
    ],
    links: [
      { rel: "canonical", href: resolveCanonical(`/categoria/${category.slug}`) },
      ...portugueseTaxonomyAlternates("category", category.slug).map((l) => ({
        rel: "alternate",
        hrefLang: l.locale,
        href: resolveCanonical(l.path),
      })),
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(categoryBreadcrumb(category)) },
    ],
  };
}
