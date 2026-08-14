import type { ArticleFrontmatter } from "@/content/schema";

/** Disclose AI-assisted editorial work without presenting AI as an information source. */
export function AiEditorialCredit({
  assistance,
  publicationDate,
}: {
  assistance: ArticleFrontmatter["aiAssistance"];
  publicationDate: string;
}) {
  if (assistance === "none") return null;
  const publicationYear = publicationDate.slice(0, 4);

  return (
    <aside
      className="mt-10 border-l-2 border-border pl-4 text-sm text-muted-foreground"
      aria-label="Transparência editorial"
    >
      Texto elaborado com auxílio de inteligência artificial (IA); direção editorial e conferência
      técnica: Olavo Oliveira, SGES ({publicationYear}).
    </aside>
  );
}
