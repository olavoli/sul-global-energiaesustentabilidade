import type { ArticleFrontmatter, ImageAiProvenance } from "./schema";

export function imageAiCreditText(provenance: ImageAiProvenance): string | null {
  if (provenance.status !== "verified") return null;
  return `Fonte: SGES (${provenance.year}).`;
}

/**
 * Resolve public tool names from article metadata and verified embedded-image provenance.
 * The cover fallback keeps client hydration and SPA navigation from downgrading an article
 * with verified AI imagery to the text-only disclosure.
 */
export function articleAiImageTools(
  article: Pick<ArticleFrontmatter, "aiImageTools" | "cover">,
): string[] {
  const verifiedCoverTools =
    article.cover.aiProvenance?.status === "verified"
      ? article.cover.aiProvenance.contributions
          .filter((contribution) => contribution.role === "generation")
          .map((contribution) => contribution.tool)
      : [];

  return [...new Set([...(article.aiImageTools ?? []), ...verifiedCoverTools])];
}
