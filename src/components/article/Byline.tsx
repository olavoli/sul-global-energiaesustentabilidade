import { useEditorialLocale, articleUi } from "@/content/locale-context";
import type { ArticleDisplay } from "@/types/content";
import { formatDate, formatReadingTime } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export function Byline({ article, className }: { article: ArticleDisplay; className?: string }) {
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
      {article.publishedAt ? (
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
      ) : (
        <span>
          {locale === "en"
            ? "Draft — unpublished"
            : locale === "es"
              ? "Borrador — sin publicar"
              : "Rascunho — não publicado"}
        </span>
      )}
      <span aria-hidden>·</span>
      <span>
        {locale === "pt-BR"
          ? formatReadingTime(article.readingTime)
          : `${article.readingTime} ${ui.reading}`}
      </span>
    </div>
  );
}
