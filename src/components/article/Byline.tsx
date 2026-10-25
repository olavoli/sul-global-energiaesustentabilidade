import { useEditorialLocale, articleUi } from "@/content/locale-context";
import type { Article } from "@/types/content";
import { formatDate, formatReadingTime } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export function Byline({ article, className }: { article: Article; className?: string }) {
  const locale = useEditorialLocale();
  const ui = articleUi[locale];
  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground " +
        (className ?? "")
      }
    >
      <span>
        {ui.by}{" "}
        <Link
          to="/autor/$slug"
          params={{ slug: article.author.slug }}
          className="font-medium text-foreground hover:underline"
        >
          {article.author.displayName}
        </Link>
      </span>
      <span aria-hidden>·</span>
      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
      <span aria-hidden>·</span>
      <span>
        {locale === "pt-BR"
          ? formatReadingTime(article.readingTime)
          : `${article.readingTime} ${ui.reading}`}
      </span>
    </div>
  );
}
