import type { Article } from "@/types/content";
import { categories } from "@/data/categories";
import { normalize } from "./format";

export function searchArticles(articles: Article[], query: string): Article[] {
  const q = normalize(query.trim());
  if (!q) return [];
  return articles.filter((a) => {
    const catName = categories.find((c) => c.slug === a.category)?.name ?? a.category;
    const haystack = normalize(
      [a.title, a.subtitle, a.excerpt, a.author.name, catName, a.tags.join(" ")].join(" "),
    );
    return haystack.includes(q);
  });
}
