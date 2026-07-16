import authorRecords from "../../content/authors.json";

import type { Author } from "@/content/schema";

const authorList = authorRecords as unknown as Author[];

export const authors: Record<string, Author> = Object.fromEntries(
  authorList.map((author) => [author.slug, author]),
);

export function getAuthor(slug: string): Author | undefined {
  return authors[slug];
}

export function getAuthors(): Author[] {
  return [...authorList];
}

export function getPublicAuthor(slug: string, allowDemo = false): Author | undefined {
  const author = authors[slug];
  if (!author || author.status === "pending" || author.status === "inactive") return undefined;
  if (author.isDemo && !allowDemo) return undefined;
  return author;
}

export function getPublicAuthors(allowDemo = false): Author[] {
  return authorList.filter(
    (author) => author.status === "verified" || (allowDemo && author.status === "demo"),
  );
}
