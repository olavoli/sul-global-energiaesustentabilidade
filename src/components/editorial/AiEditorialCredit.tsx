import { useEditorialLocale, articleUi } from "@/content/locale-context";
import type { ArticleFrontmatter } from "@/content/schema";
import { Fragment } from "react";

/** Disclose AI-assisted editorial work without presenting AI as an information source. */
export function AiEditorialCredit({
  assistance,
  publicationDate,
  imageTools = [],
  disclosure,
}: {
  assistance: ArticleFrontmatter["aiAssistance"];
  publicationDate: string;
  imageTools?: string[];
  disclosure?: string;
}) {
  const ui = articleUi[useEditorialLocale()];
  if (assistance === "none") return null;
  const publicationYear = publicationDate.slice(0, 4);
  const blocks = disclosure?.split("\n\n");
  const sectionedDisclosure =
    blocks?.length === 2 &&
    blocks[0].startsWith("Criação visual: ") &&
    blocks[1].startsWith("Pesquisa e revisão: ")
      ? blocks
      : undefined;

  return (
    <aside
      className="mt-10 border-l-2 border-border pl-4 text-sm text-muted-foreground"
      aria-labelledby="ai-transparency-title"
    >
      <h2 id="ai-transparency-title" className="font-semibold text-foreground">
        {ui.transparency}
      </h2>
      {sectionedDisclosure ? (
        sectionedDisclosure.map((block) => {
          const separator = block.indexOf(":");
          return (
            <p className="mt-2" key={block.slice(0, separator)}>
              <strong>{block.slice(0, separator + 1)}</strong> {block.slice(separator + 2)}
            </p>
          );
        })
      ) : (
        <p className="mt-2">
          {disclosure ? (
            disclosure
          ) : imageTools.length > 0 ? (
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
      )}
    </aside>
  );
}
