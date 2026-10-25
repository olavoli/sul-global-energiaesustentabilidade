import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ArticleDetailView } from "@/routes/artigo.$slug";
import { translationRecords } from "@/content/generated/translations";
import { getArticleBySlug } from "@/content/repository";
import { authors } from "@/data/authors";
import { EditorialLocaleContext, LanguageNavigationContext } from "@/content/locale-context";
import { languageForPath } from "@/content/i18n";
import "@/styles.css";

const original = getArticleBySlug("terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1");
if (!original) throw new Error("Published PT original missing");
const editions = [
  original,
  ...translationRecords.map((record) => ({
    ...record,
    id: `${record.locale}:${record.slug}`,
    author: authors[record.author],
  })),
];
const options = editions.map((edition, index) => ({
  locale: index === 0 ? ("pt-BR" as const) : translationRecords[index - 1].locale,
  href: edition.canonicalUrl ?? `/artigo/${edition.slug}`,
  fallback: false,
}));
const queryClient = new QueryClient();
export function Review() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const locale = languageForPath(path);
  const article = editions.find((a) => a.canonicalUrl === path);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <QueryClientProvider client={queryClient}>
      <EditorialLocaleContext.Provider value={locale}>
        <LanguageNavigationContext.Provider value={options}>
          <div className="border-b bg-muted px-4 py-2 text-sm" data-review-notice>
            PR #13 — PRÉVIA LOCAL. EN/ES são rascunhos sem aprovação humana. Nada publicado.
          </div>
          <SiteHeader />
          <main id="conteudo">
            {article ? (
              <ArticleDetailView article={article} related={[]} locale={locale} previewOnly />
            ) : (
              <section className="mx-auto max-w-3xl p-8">
                <h1>Prévia editorial isolada PT / EN / ES</h1>
                <p>
                  Somente estes artigos são renderizados neste laboratório. Outros links preservam
                  seus destinos, mas não simulam páginas do portal.
                </p>
                <ul>
                  {options.map((o) => (
                    <li key={o.locale}>
                      <a href={o.href}>{o.locale} — ART-033</a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </main>
          <SiteFooter />
        </LanguageNavigationContext.Provider>
      </EditorialLocaleContext.Provider>
    </QueryClientProvider>
  );
}
const root = createRootRoute({ component: Review });
const index = createRoute({ getParentRoute: () => root, path: "/" });
const rest = createRoute({ getParentRoute: () => root, path: "$" });
const router = createRouter({ routeTree: root.addChildren([index, rest]) });
const mount = document.getElementById("root");
if (!mount) throw new Error("Preview mount missing");
createRoot(mount).render(<RouterProvider router={router} />);
