import { translationLoaders } from "@/content/generated/translations";
import type { ContentLocale } from "@/content/translation-schema";
import { lazy, Suspense, useMemo, type ReactNode } from "react";

import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { articleLoaders } from "@/content/generated/loaders";

/** Load and render only the requested article body as validated MDX. */
export function ArticleBody({
  slug,
  section = "body",
  wrapLongWords = false,
  locale = "pt-BR",
}: {
  slug: string;
  locale?: ContentLocale;
  section?: "body" | "keyPoints" | "references";
  wrapLongWords?: boolean;
}) {
  const Content = useMemo(() => {
    const loader =
      locale === "pt-BR" ? articleLoaders[slug] : translationLoaders[`${locale}:${slug}`];
    if (!loader) throw new Error(`Corpo MDX não encontrado para ${slug}.`);
    return lazy(loader);
  }, [slug, locale]);

  const components = useMemo(
    () => ({
      ...editorialMdxComponents,
      EditorialSlot: ({ section: slot, children }: { section: string; children: ReactNode }) =>
        slot === section ? children : null,
    }),
    [section],
  );

  return (
    <div
      className={`prose-editorial text-foreground${wrapLongWords ? " [overflow-wrap:anywhere]" : ""}`}
    >
      <Suspense
        fallback={
          section === "body" ? (
            <p className="text-muted-foreground" data-tts-exclude="true">
              {locale === "en"
                ? "Loading article…"
                : locale === "es"
                  ? "Cargando artículo…"
                  : "Carregando artigo…"}
            </p>
          ) : null
        }
      >
        <Content components={components} />
      </Suspense>
    </div>
  );
}
