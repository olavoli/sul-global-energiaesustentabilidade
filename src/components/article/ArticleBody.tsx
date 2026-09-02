import { lazy, Suspense, useMemo, type ReactNode } from "react";

import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { articleLoaders } from "@/content/generated/loaders";

/** Load and render only the requested article body as validated MDX. */
export function ArticleBody({
  slug,
  section = "body",
}: {
  slug: string;
  section?: "body" | "keyPoints" | "references";
}) {
  const Content = useMemo(() => {
    const loader = articleLoaders[slug];
    if (!loader) throw new Error(`Corpo MDX não encontrado para ${slug}.`);
    return lazy(loader);
  }, [slug]);

  const components = useMemo(
    () => ({
      ...editorialMdxComponents,
      EditorialSlot: ({ section: slot, children }: { section: string; children: ReactNode }) =>
        slot === section ? children : null,
    }),
    [section],
  );

  return (
    <div className="prose-editorial text-foreground">
      <Suspense
        fallback={
          section === "body" ? (
            <p className="text-muted-foreground" data-tts-exclude="true">
              Carregando artigo…
            </p>
          ) : null
        }
      >
        <Content components={components} />
      </Suspense>
    </div>
  );
}
