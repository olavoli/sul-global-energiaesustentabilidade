import { ArticlePermalink } from "./ArticlePermalink";
import { useEditorialLocale, articleUi } from "@/content/locale-context";
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
  const locale = useEditorialLocale();
  const ui = articleUi[locale];
  const titleClass =
    size === "lg" ? "text-2xl md:text-3xl" : size === "sm" ? "text-lg" : "text-xl md:text-[1.4rem]";

  return (
    <article className="group flex flex-col gap-3">
      <ArticlePermalink
        article={article}
        className="block overflow-hidden bg-muted"
        ariaLabel={article.title}
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
      </ArticlePermalink>
      <div className="flex flex-col gap-2">
        <CategoryTag slug={article.category} />
        <h3 className={`font-serif font-semibold leading-tight text-foreground ${titleClass}`}>
          <ArticlePermalink article={article} className="hover:underline">
            {article.title}
          </ArticlePermalink>
        </h3>
        {size !== "sm" && (
          <p className="text-sm text-muted-foreground line-clamp-3 md:text-base">
            {article.excerpt}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {article.author.displayName} · {formatDate(article.publishedAt, locale)} ·{" "}
          {locale === "pt-BR"
            ? formatReadingTime(article.readingTime)
            : `${article.readingTime} ${ui.reading}`}
        </p>
      </div>
    </article>
  );
}
