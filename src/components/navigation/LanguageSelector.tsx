import { useRouterState } from "@tanstack/react-router";
import { languageOptions, languageForPath, languageLabels } from "@/content/i18n";

/** Native links work with keyboard/touch and without client-side translation. */
export function LanguageLinks({ pathname }: { pathname: string }) {
  const locale = languageForPath(pathname);
  const catalogLabel = {
    "pt-BR": "catálogo; tradução indisponível",
    en: "catalog; translation unavailable",
    es: "catálogo; traducción no disponible",
  }[locale];
  return (
    <details className="relative shrink-0">
      <summary
        className="flex min-h-11 cursor-pointer items-center rounded-md border border-border px-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Language / Idioma"
      >
        {locale === "pt-BR" ? "PT" : locale.toUpperCase()}
      </summary>
      <nav
        aria-label="Language / Idioma"
        className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-border bg-background p-2 shadow-lg"
      >
        {languageOptions(pathname).map((option) => (
          <a
            key={option.locale}
            href={option.href}
            hrefLang={option.locale}
            lang={option.locale}
            aria-current={option.locale === locale ? "page" : undefined}
            className="block min-h-11 rounded px-3 py-2 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {languageLabels[option.locale]}
            {option.fallback ? ` — ${catalogLabel}` : ""}
          </a>
        ))}
      </nav>
    </details>
  );
}
export function LanguageSelector() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return <LanguageLinks pathname={pathname} />;
}
