import { Link } from "@tanstack/react-router";
import { getCategory } from "@/data/categories";
import type { CategorySlug } from "@/types/content";

export function CategoryTag({
  slug,
  className,
}: {
  slug: CategorySlug;
  className?: string;
}) {
  const cat = getCategory(slug);
  if (!cat) return null;
  return (
    <Link
      to="/categoria/$slug"
      params={{ slug: cat.slug }}
      className={
        "overline text-primary transition-colors hover:text-accent " +
        (className ?? "")
      }
    >
      {cat.name}
    </Link>
  );
}