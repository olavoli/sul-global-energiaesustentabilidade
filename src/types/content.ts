/** Sul Global content model — types for articles, authors and categories. */

export type CategorySlug =
  | "energia"
  | "sustentabilidade"
  | "ciencia"
  | "tecnologia"
  | "desenvolvimento"
  | "transicao-energetica";

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
}

export interface Author {
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
}

export type ArticleStatus = "published" | "draft";

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImageAlt: string;
  category: CategorySlug;
  tags: string[];
  author: Author;
  publishedAt: string;
  readingTime: number;
  featured: boolean;
  status: ArticleStatus;
}