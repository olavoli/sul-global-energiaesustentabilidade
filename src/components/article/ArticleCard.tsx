import { Link } from "@tanstack/react-router";
import type { Article } from "@/types/content";
import { CategoryTag } from "./CategoryTag";
import { formatDate, formatReadingTime } from "@/lib/format";
import { EditorialImage } from "@/components/media/EditorialImage";

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
    size === "lg" ? "text-2xl md:text-3xl" : size === "sm" ? "text-lg" : "text-xl md:text-[1.4rem]";

  return (
    <article className="group flex flex-col gap-3">
      <Link
        to="/artigo/$slug"
        params={{ slug: article.slug }}
        className="block overflow-hidden bg-muted"
        aria-label={article.title}
      >
        <EditorialImage
          image={article.cover}
          priority={eager}
          aspectRatio={16 / 9}
          sizes={
            size === "lg"
              ? "(min-width: 768px) 50vw, 100vw"
              : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          }
          className="transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </Link>
      <div className="flex flex-col gap-2">
        <CategoryTag slug={article.category} />
        <h3 className={`font-serif font-semibold leading-tight text-foreground ${titleClass}`}>
          <Link to="/artigo/$slug" params={{ slug: article.slug }} className="hover:underline">
            {article.title}
          </Link>
        </h3>
        {size !== "sm" && (
          <p className="text-sm text-muted-foreground line-clamp-3 md:text-base">
            {article.excerpt}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {article.author.name} · {formatDate(article.publishedAt)} ·{" "}
          {formatReadingTime(article.readingTime)}
        </p>
      </div>
    </article>
  );
}
