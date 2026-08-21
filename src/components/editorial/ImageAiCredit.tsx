import type { ImageAiProvenance } from "@/content/schema";

/** Render the concise public SGES source credit for verified in-house imagery. */
export function ImageAiCredit({ provenance }: { provenance?: ImageAiProvenance }) {
  if (!provenance || provenance.status !== "verified") return null;
  return <>Fonte: SGES ({provenance.year}).</>;
}
