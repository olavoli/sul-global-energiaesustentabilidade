/** Domain types derived from the validated editorial schemas. */
import type { ArticleFrontmatter, Author } from "@/content/schema";

export type {
  ArticleContentType,
  ArticleFrontmatter,
  ArticleStatus,
  Author,
  Category,
  CategorySlug,
  EditorialImage,
  ResponsiveImageSource,
} from "@/content/schema";

export type Article = Omit<ArticleFrontmatter, "author" | "publishedAt" | "status"> & {
  id: string;
  author: Author;
  publishedAt: string;
  status: "published";
};

export type ArticleSummary = Pick<
  Article,
  "slug" | "title" | "subtitle" | "excerpt" | "category" | "tags" | "author" | "publishedAt"
>;
