import { sourceTerm, taxonomyPath, taxonomySlug } from "@/content/taxonomy-catalog";
import { useEditorialLocale } from "@/content/locale-context";

export function ArticleTags({ tags }: { tags: readonly string[] }) {
  const locale = useEditorialLocale();
  return (
    <nav
      aria-label={
        locale === "en"
          ? "Article topics"
          : locale === "es"
            ? "Temas del artículo"
            : "Temas do artigo"
      }
      className="mt-10 flex flex-wrap gap-2"
    >
      {tags.map((tag) => (
        <a
          key={tag}
          href={
            locale === "pt-BR"
              ? `/tag/${taxonomySlug(tag)}`
              : taxonomyPath(sourceTerm("tag", tag), locale)
          }
          className="inline-flex min-h-9 max-w-full items-center rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          #{locale === "pt-BR" ? tag : sourceTerm("tag", tag).editions[locale].label}
        </a>
      ))}
    </nav>
  );
}
