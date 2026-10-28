import { Link } from "@tanstack/react-router";
import { useEditorialLocale } from "../../content/locale-context";
import { sourceTerm, taxonomyPath } from "../../content/taxonomy-catalog";
import type { NavItem } from "./nav-items";
/** Render a category through the catalog while retaining all non-taxonomy destinations. */
export function TaxonomyNavLink({
  item,
  className,
  onClick,
}: {
  item: NavItem;
  className?: string;
  onClick?: () => void;
}) {
  const locale = useEditorialLocale();
  const term = item.params ? sourceTerm("category", item.params.slug) : undefined;
  return (
    <Link
      to={term ? taxonomyPath(term, locale) : item.to}
      onClick={onClick}
      className={className}
      activeProps={{ className: "text-foreground" }}
      lang={locale}
    >
      {term ? term.editions[locale].label : item.label}
    </Link>
  );
}
