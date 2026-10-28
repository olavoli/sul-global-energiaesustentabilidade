import { sourceTerm, taxonomyPath } from "@/content/taxonomy-catalog";
import { useEditorialLocale } from "@/content/locale-context";
import { getCategory } from "@/data/categories";
import type { CategorySlug } from "@/types/content";

export function CategoryTag({ slug, className }: { slug: CategorySlug; className?: string }) {
  const locale = useEditorialLocale();
  const cat = getCategory(slug);
  if (!cat) return null;
  return (
    <a
      href={taxonomyPath(sourceTerm("category", slug), locale)}
      className={"overline text-primary transition-colors hover:text-accent " + (className ?? "")}
    >
      {sourceTerm("category", slug).editions[locale].label}
    </a>
  );
}
