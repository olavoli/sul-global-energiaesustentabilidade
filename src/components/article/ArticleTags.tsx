import { Link } from "@tanstack/react-router";
import { tagSlug } from "@/content/tags";

export function ArticleTags({ tags }: { tags: readonly string[] }) {
  return (
    <nav aria-label="Temas do artigo" className="mt-10 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link
          key={tag}
          to="/tag/$slug"
          params={{ slug: tagSlug(tag) }}
          className="inline-flex min-h-9 max-w-full items-center rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          #{tag}
        </Link>
      ))}
    </nav>
  );
}
