import type { ImageAiProvenance } from "./schema";

export function imageAiCreditText(provenance: ImageAiProvenance): string | null {
  if (provenance.status !== "verified") return null;
  return `Fonte: SGES (${provenance.year}).`;
}
