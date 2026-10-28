import { taxonomySlug as tagSlug } from "./taxonomy-catalog";
import { getPublishedArticles } from "./repository";

export const MIN_TAG_ARTICLES_FOR_INDEXING = 2;

interface TaggedArticle {
  slug: string;
  tags: readonly string[];
  status: string;
  publishedAt?: string;
  isDemo: boolean;
}

export interface TagTopic<T extends TaggedArticle> {
  name: string;
  slug: string;
  articles: T[];
  indexable: boolean;
}

export { taxonomySlug as tagSlug } from "./taxonomy-catalog";

/** Exact tag membership, restricted to real articles already published. */
export function buildTagTopics<T extends TaggedArticle>(
  articles: readonly T[],
  today = new Date().toISOString().slice(0, 10),
): TagTopic<T>[] {
  const topics = new Map<string, TagTopic<T>>();
  for (const article of articles) {
    if (
      article.isDemo ||
      article.status !== "published" ||
      !article.publishedAt ||
      article.publishedAt > today
    ) {
      continue;
    }
    for (const name of new Set(article.tags)) {
      const slug = tagSlug(name);
      const topic = topics.get(slug) ?? { name, slug, articles: [], indexable: false };
      if (topic.name !== name) {
        throw new Error(`Tags diferentes geram o mesmo endereço: ${topic.name} / ${name}`);
      }
      if (!topic.articles.some((item) => item.slug === article.slug)) topic.articles.push(article);
      topics.set(slug, topic);
    }
  }
  return [...topics.values()]
    .map((topic) => ({
      ...topic,
      articles: topic.articles.sort(
        (a, b) =>
          b.publishedAt!.localeCompare(a.publishedAt!) || a.slug.localeCompare(b.slug, "pt-BR"),
      ),
      indexable: topic.articles.length >= MIN_TAG_ARTICLES_FOR_INDEXING,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export const getPublishedTagTopics = () => buildTagTopics(getPublishedArticles());
export const getTagTopic = (slug: string) =>
  getPublishedTagTopics().find((topic) => topic.slug === slug);
