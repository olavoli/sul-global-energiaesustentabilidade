import { lazy, Suspense, useMemo } from "react";

import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { articleLoaders } from "@/content/generated/loaders";

/** Load and render only the requested article body as validated MDX. */
export function ArticleBody({ slug }: { slug: string }) {
  const Content = useMemo(() => {
    const loader = articleLoaders[slug];
    if (!loader) throw new Error(`Corpo MDX não encontrado para ${slug}.`);
    return lazy(loader);
  }, [slug]);

  return (
    <div className="prose-editorial text-foreground">
      <Suspense fallback={<p className="text-muted-foreground">Carregando artigo…</p>}>
        <Content components={editorialMdxComponents} />
      </Suspense>
    </div>
  );
}
