import { Link } from "@tanstack/react-router";
import type { Article } from "@/types/content";
import { CategoryTag } from "./CategoryTag";
import { formatDate, formatReadingTime } from "@/lib/format";

export function ArticleCard({
  article,
  size = "md",
  eager = false,
}: {
  article: Article;
  size?: "sm" | "md" | "lg";
  eager?: boolean;
}) {
  const titleClass =
    size === "lg"
      ? "text-2xl md:text-3xl"
      : size === "sm"
        ? "text-lg"
        : "text-xl md:text-[1.4rem]";

  return (
    <article className="group flex flex-col gap-3">
      <Link
        to="/artigo/$slug"
        params={{ slug: article.slug }}
        className="block overflow-hidden bg-muted"
        aria-label={article.title}
      >
        <div className="aspect-[16/9] w-full">
          <img
            src={article.coverImage}
            alt={article.coverImageAlt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      </Link>
      <div className="flex flex-col gap-2">
        <CategoryTag slug={article.category} />
        <h3 className={`font-serif font-semibold leading-tight text-foreground ${titleClass}`}>
          <Link
            to="/artigo/$slug"
            params={{ slug: article.slug }}
            className="hover:underline"
          >
            {article.title}
          </Link>
        </h3>
        {size !== "sm" && (
          <p className="text-sm text-muted-foreground line-clamp-3 md:text-base">
            {article.excerpt}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {article.author.name} · {formatDate(article.publishedAt)} · {formatReadingTime(article.readingTime)}
        </p>
      </div>
    </article>
  );
}