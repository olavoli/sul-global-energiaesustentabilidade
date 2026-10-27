import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Article } from "@/types/content";

/** Preserve the legacy router link; translated editions use their own canonical. */
export function ArticlePermalink({
  article,
  children,
  className,
  ariaLabel,
}: {
  article: Article;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  if (article.canonicalUrl?.match(/^\/(en|es)\//))
    return (
      <a href={article.canonicalUrl} className={className} aria-label={ariaLabel}>
        {children}
      </a>
    );
  return (
    <Link
      to="/artigo/$slug"
      params={{ slug: article.slug }}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
