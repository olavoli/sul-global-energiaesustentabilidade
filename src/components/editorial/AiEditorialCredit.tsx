import type { ArticleFrontmatter } from "@/content/schema";
import { Fragment } from "react";

/** Disclose AI-assisted editorial work without presenting AI as an information source. */
export function AiEditorialCredit({
  assistance,
  publicationDate,
  imageTools = [],
}: {
  assistance: ArticleFrontmatter["aiAssistance"];
  publicationDate: string;
  imageTools?: string[];
}) {
  if (assistance === "none") return null;
  const publicationYear = publicationDate.slice(0, 4);

  return (
    <aside
      className="mt-10 border-l-2 border-border pl-4 text-sm text-muted-foreground"
      aria-labelledby="ai-transparency-title"
    >
      <h2 id="ai-transparency-title" className="font-semibold text-foreground">
        Transparência sobre uso de IA
      </h2>
      <p className="mt-2">
        {imageTools.length > 0 ? (
          <>
            Texto e imagens geradas por IA (
            {imageTools.map((tool, index) => (
              <Fragment key={`${tool}-${index}`}>
                {index > 0 ? " + " : ""}
                <em>{tool}</em>
              </Fragment>
            ))}
            ), com edição e conferência técnica de Olavo Oliveira, SGES ({publicationYear}).
          </>
        ) : (
          <>
            Texto elaborado com auxílio de inteligência artificial (IA); direção editorial e
            conferência técnica: Olavo Oliveira, SGES ({publicationYear}).
          </>
        )}
      </p>
    </aside>
  );
}
