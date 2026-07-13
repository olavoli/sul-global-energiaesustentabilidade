import { Link } from "@tanstack/react-router";
import type { CategorySlug } from "@/types/content";

export function SectionTitle({
  label,
  categorySlug,
}: {
  label: string;
  categorySlug?: CategorySlug;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-3">
      <h2 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">{label}</h2>
      {categorySlug && (
        <Link
          to="/categoria/$slug"
          params={{ slug: categorySlug }}
          className="overline text-muted-foreground hover:text-foreground"
        >
          Ver mais
        </Link>
      )}
    </div>
  );
}
