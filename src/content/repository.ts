import { demoContentEnabled } from "@/config/editorial";
import { environmentConfig } from "@/config/environment";
import { authors } from "@/data/authors";
import { categories } from "@/data/categories";
import { normalize } from "@/lib/format";
import type { Article, ArticleFrontmatter, CategorySlug } from "@/types/content";
import { articleRecords } from "./generated/articles";

export interface ContentRepository {
  getPublishedArticles(): Article[];
  getArticleBySlug(slug: string): Article | undefined;
  getArticlesByCategory(slug: string): Article[];
  getArticlesByAuthor(slug: string): Article[];
  getFeaturedArticles(): Article[];
  getLatestArticles(limit?: number): Article[];
  getRelatedArticles(article: Article, limit?: number): Article[];
  searchArticles(query: string): Article[];
}

type RelatedArticleMetadata = Pick<Article, "slug" | "category" | "tags" | "contentType">;

/** Rank related articles from validated metadata only, with stable non-recency tie-breaking. */
export function selectRelatedArticles<T extends RelatedArticleMetadata>(
  article: RelatedArticleMetadata,
  candidates: readonly T[],
  limit = 3,
): T[] {
  const safeLimit = Math.max(0, Math.min(3, Math.trunc(limit)));

  return candidates
    .filter((candidate) => candidate.slug !== article.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => article.tags.includes(tag)).length;
      const score =
        sharedTags * 6 +
        Number(candidate.category === article.category) * 4 +
        Number(candidate.contentType === article.contentType);
      return { candidate, score, sharedTags };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.sharedTags - left.sharedTags ||
        left.candidate.slug.localeCompare(right.candidate.slug, "pt-BR"),
    )
    .slice(0, safeLimit)
    .map(({ candidate }) => candidate);
}

function toPublishedArticle(record: ArticleFrontmatter): Article {
  const author = authors[record.author];
  if (!author) throw new Error(`${record.slug}: autor não encontrado.`);
  if (record.status !== "published" || !record.publishedAt) {
    throw new Error(`${record.slug}: registro não está publicado.`);
  }
  return {
    ...record,
    id: record.slug,
    author,
    status: "published",
    publishedAt: record.publishedAt,
  };
}

/** Create a repository over validated metadata without exposing MDX details. */
export function createContentRepository(
  records: readonly ArticleFrontmatter[],
  allowDemo: boolean,
  today = new Date().toISOString().slice(0, 10),
): ContentRepository {
  const published = records
    .filter(
      (record) =>
        record.status === "published" &&
        Boolean(record.publishedAt && record.publishedAt <= today) &&
        (!record.isDemo || allowDemo),
    )
    .map(toPublishedArticle)
    .sort(
      (left, right) =>
        right.publishedAt.localeCompare(left.publishedAt) ||
        left.slug.localeCompare(right.slug, "pt-BR"),
    );

  const byCategoryName = new Map(categories.map((category) => [category.slug, category.name]));

  return {
    getPublishedArticles: () => [...published],
    getArticleBySlug: (slug) => published.find((article) => article.slug === slug),
    getArticlesByCategory: (slug) => published.filter((article) => article.category === slug),
    getArticlesByAuthor: (slug) => published.filter((article) => article.author.slug === slug),
    getFeaturedArticles: () => published.filter((article) => article.featured),
    getLatestArticles: (limit = 8) => published.slice(0, limit),
    getRelatedArticles: (article, limit = 3) => selectRelatedArticles(article, published, limit),
    searchArticles: (query) => {
      const term = normalize(query.trim());
      if (!term) return [];
      return published.filter((article) => {
        const haystack = normalize(
          [
            article.title,
            article.subtitle,
            article.excerpt,
            byCategoryName.get(article.category as CategorySlug) ?? article.category,
            article.tags.join(" "),
            article.author.displayName,
          ].join(" "),
        );
        return haystack.includes(term);
      });
    },
  };
}

function requestContentRepository(): ContentRepository {
  return createContentRepository(
    articleRecords,
    demoContentEnabled || environmentConfig.isStaging,
    new Date().toISOString().slice(0, 10),
  );
}

export const getPublishedArticles = () => requestContentRepository().getPublishedArticles();
export const getArticleBySlug = (slug: string) => requestContentRepository().getArticleBySlug(slug);
export const getArticlesByCategory = (slug: string) =>
  requestContentRepository().getArticlesByCategory(slug);
export const getArticlesByAuthor = (slug: string) =>
  requestContentRepository().getArticlesByAuthor(slug);
export const getFeaturedArticles = () => requestContentRepository().getFeaturedArticles();
export const getLatestArticles = (limit?: number) =>
  requestContentRepository().getLatestArticles(limit);
export const getRelatedArticles = (article: Article, limit?: number) =>
  requestContentRepository().getRelatedArticles(article, limit);
export const searchArticles = (query: string) => requestContentRepository().searchArticles(query);
