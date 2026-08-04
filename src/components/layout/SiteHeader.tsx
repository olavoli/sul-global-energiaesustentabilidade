import { Link } from "@tanstack/react-router";
import { useCallback, useReducer, useRef } from "react";
import { Menu, Search } from "lucide-react";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { mobileMenuReducer } from "@/components/navigation/mobile-menu-state";
import { primaryNav } from "@/components/navigation/nav-items";

export function SiteHeader() {
  const [menuOpen, dispatchMenu] = useReducer(mobileMenuReducer, false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => dispatchMenu("close"), []);
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="border-b border-border/60 bg-primary text-primary-foreground">
        <Container className="flex h-8 items-center justify-between">
          <span className="overline">Sul Global Energia e Sustentabilidade</span>
          <span className="hidden overline sm:inline" suppressHydrationWarning>
            {today}
          </span>
        </Container>
      </div>

      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            ref={menuTriggerRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-dialog"
            onClick={() => dispatchMenu("toggle")}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <Logo />
        </div>

        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex lg:items-center lg:gap-3 xl:gap-6"
        >
          {primaryNav.slice(0, 6).map((item) => (
            <Link
              key={item.label}
              to={item.to}
              params={item.params}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/busca"
            aria-label="Buscar no portal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
          >
            <Search className="h-4 w-4" aria-hidden />
          </Link>
          <ThemeToggle />
        </div>
      </Container>

      <MobileMenu open={menuOpen} onClose={closeMenu} returnFocusRef={menuTriggerRef} />
    </header>
  );
}
