import type { ImageAiProvenance } from "@/content/schema";

function ToolList({ tools }: { tools: string[] }) {
  return (
    <>
      {tools.map((tool, index) => (
        <span key={`${tool}-${index}`}>
          {index > 0 ? " + " : ""}
          <em>{tool}</em>
        </span>
      ))}
    </>
  );
}

/** Render the SGES image provenance standard only when the tool is verified. */
export function ImageAiCredit({ provenance }: { provenance?: ImageAiProvenance }) {
  if (!provenance || provenance.status !== "verified") return null;

  const generated = provenance.contributions
    .filter((item) => item.role === "generation")
    .map((item) => item.tool);
  const edited = provenance.contributions
    .filter((item) => item.role === "editing")
    .map((item) => item.tool);
  if (generated.length === 0) return null;

  return (
    <>
      Fonte: Imagem gerada por IA (<ToolList tools={generated} />)
      {edited.length > 0 && (
        <>
          {" "}
          e editada com IA (
          <ToolList tools={edited} />)
        </>
      )}
      , sob curadoria, direção editorial e conferência técnica de Olavo Oliveira, SGES (
      {provenance.year}).
    </>
  );
}
