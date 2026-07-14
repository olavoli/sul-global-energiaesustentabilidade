import type { Article } from "@/types/content";
import { formatDate, formatReadingTime } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export function Byline({ article, className }: { article: Article; className?: string }) {
  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground " +
        (className ?? "")
      }
    >
      <span>
        Por{" "}
        <Link
          to="/autor/$slug"
          params={{ slug: article.author.slug }}
          className="font-medium text-foreground hover:underline"
        >
          {article.author.name}
        </Link>
      </span>
      <span aria-hidden>·</span>
      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      <span aria-hidden>·</span>
      <span>{formatReadingTime(article.readingTime)}</span>
    </div>
  );
}
