import { useEditorialLocale } from "@/content/locale-context";
import { sourceTerm, taxonomyPath } from "@/content/taxonomy-catalog";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function ScienceMenu({
  onNavigate,
  mobile = false,
}: {
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const locale = useEditorialLocale();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={
          mobile
            ? "flex min-h-11 w-full items-center gap-2 py-3 font-serif text-xl font-semibold focus-visible:ring-2 focus-visible:ring-ring"
            : "flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        {sourceTerm("category", "ciencia").editions[locale].label}{" "}
        <ChevronDown className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[110]">
        <DropdownMenuItem asChild>
          <a
            href={taxonomyPath(sourceTerm("category", "ciencia"), locale)}
            onClick={onNavigate}
            className="min-h-11"
          >
            {sourceTerm("category", "ciencia").editions[locale].label}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={taxonomyPath(sourceTerm("category", "politicas-publicas"), locale)}
            onClick={onNavigate}
            className="min-h-11"
          >
            {sourceTerm("category", "politicas-publicas").editions[locale].label}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
