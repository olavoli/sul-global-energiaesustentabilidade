import type { ImageAiProvenance } from "./schema";

export function imageAiCreditText(provenance: ImageAiProvenance): string | null {
  if (provenance.status !== "verified") return null;

  const generated = provenance.contributions
    .filter((item) => item.role === "generation")
    .map((item) => item.tool);
  const edited = provenance.contributions
    .filter((item) => item.role === "editing")
    .map((item) => item.tool);
  if (generated.length === 0) return null;

  const generation = `Imagem gerada por IA (${generated.join(" + ")})`;
  const editing = edited.length ? ` e editada com IA (${edited.join(" + ")})` : "";
  return `Fonte: ${generation}${editing}, sob curadoria, direção editorial e conferência técnica de Olavo Oliveira, SGES (${provenance.year}).`;
}
