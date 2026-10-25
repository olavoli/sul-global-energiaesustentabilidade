import { useEditorialLocale, articleUi } from "@/content/locale-context";
import type { ImageAiProvenance } from "@/content/schema";

/** Render the concise public SGES source credit for verified in-house imagery. */
export function ImageAiCredit({ provenance }: { provenance?: ImageAiProvenance }) {
  const ui = articleUi[useEditorialLocale()];
  if (!provenance || provenance.status !== "verified") return null;
  return (
    <>
      {ui.source}: SGES, ({provenance.year}).
    </>
  );
}
