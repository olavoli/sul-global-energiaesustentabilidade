/** Identify commercial influence without conflating it with editorial content. */
export function SponsoredDisclosure({ sponsorName }: { sponsorName: string }) {
  return (
    <aside
      aria-label="Conteúdo patrocinado"
      className="mb-8 border border-border bg-muted/40 p-4 text-sm text-foreground"
    >
      Conteúdo patrocinado por <strong>{sponsorName}</strong>.
    </aside>
  );
}
