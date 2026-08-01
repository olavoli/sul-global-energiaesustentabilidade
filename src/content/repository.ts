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
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

  const byCategoryName = new Map(categories.map((category) => [category.slug, category.name]));

  return {
    getPublishedArticles: () => [...published],
    getArticleBySlug: (slug) => published.find((article) => article.slug === slug),
    getArticlesByCategory: (slug) => published.filter((article) => article.category === slug),
    getArticlesByAuthor: (slug) => published.filter((article) => article.author.slug === slug),
    getFeaturedArticles: () => published.filter((article) => article.featured),
    getLatestArticles: (limit = 8) => published.slice(0, limit),
    getRelatedArticles: (article, limit = 3) =>
      published
        .filter((candidate) => candidate.slug !== article.slug)
        .map((candidate) => ({
          candidate,
          score:
            Number(candidate.category === article.category) * 10 +
            candidate.tags.filter((tag) => article.tags.includes(tag)).length,
        }))
        .filter(({ score }) => score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map(({ candidate }) => candidate),
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

export const contentRepository = createContentRepository(
  articleRecords,
  demoContentEnabled || environmentConfig.isStaging,
);

export const getPublishedArticles = contentRepository.getPublishedArticles;
export const getArticleBySlug = contentRepository.getArticleBySlug;
export const getArticlesByCategory = contentRepository.getArticlesByCategory;
export const getArticlesByAuthor = contentRepository.getArticlesByAuthor;
export const getFeaturedArticles = contentRepository.getFeaturedArticles;
export const getLatestArticles = contentRepository.getLatestArticles;
export const getRelatedArticles = contentRepository.getRelatedArticles;
export const searchArticles = contentRepository.searchArticles;
