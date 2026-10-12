import { Link } from "@tanstack/react-router";
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
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={
          mobile
            ? "flex min-h-11 w-full items-center gap-2 py-3 font-serif text-xl font-semibold focus-visible:ring-2 focus-visible:ring-ring"
            : "flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        Ciência <ChevronDown className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[110]">
        <DropdownMenuItem asChild>
          <Link
            to="/categoria/$slug"
            params={{ slug: "ciencia" }}
            onClick={onNavigate}
            className="min-h-11"
          >
            Ciência
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/categoria/$slug"
            params={{ slug: "politicas-publicas" }}
            onClick={onNavigate}
            className="min-h-11"
          >
            Políticas Públicas
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
