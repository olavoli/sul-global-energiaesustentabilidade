import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { imageAiProvenanceSchema } from "@/content/schema";
import { imageAiCreditText } from "@/content/image-ai-credit";
import { AiEditorialCredit } from "./AiEditorialCredit";
import { ImageAiCredit } from "./ImageAiCredit";
import { Figure } from "./MdxComponents";

describe("proveniência de IA em imagens", () => {
  test("gera o padrão SGES com ferramenta e ano estruturados", () => {
    const provenance = imageAiProvenanceSchema.parse({
      status: "verified",
      contributions: [{ role: "generation", tool: "ChatGPT" }],
      year: 2031,
    });
    const html = renderToStaticMarkup(<ImageAiCredit provenance={provenance} />);

    expect(html).toContain("Imagem gerada por IA (");
    expect(html).toContain("<em>ChatGPT</em>");
    expect(html).toContain("Olavo Oliveira, SGES (2031)");
    expect(imageAiCreditText(provenance)).toContain("Imagem gerada por IA (ChatGPT)");
  });

  test("gera exatamente o crédito comprovado por C2PA do ART-011", () => {
    const provenance = imageAiProvenanceSchema.parse({
      status: "verified",
      contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
      year: 2026,
    });

    expect(imageAiCreditText(provenance)).toBe(
      "Fonte: Imagem gerada por IA (GPT Image 2, OpenAI), sob curadoria, direção editorial e conferência técnica de Olavo Oliveira, SGES (2026).",
    );
    expect(renderToStaticMarkup(<ImageAiCredit provenance={provenance} />)).toContain(
      "<em>GPT Image 2, OpenAI</em>",
    );
  });

  test("registra geração e edição por ferramentas comprovadas", () => {
    const provenance = imageAiProvenanceSchema.parse({
      status: "verified",
      contributions: [
        { role: "generation", tool: "ChatGPT" },
        { role: "editing", tool: "Adobe Firefly" },
      ],
      year: 2026,
    });

    const html = renderToStaticMarkup(<ImageAiCredit provenance={provenance} />);
    expect(html).toContain("editada com IA (");
    expect(html).toContain("<em>Adobe Firefly</em>");
  });

  test("não atribui ferramenta quando a comprovação está incompleta", () => {
    const partial = imageAiProvenanceSchema.parse({
      status: "partially-verified",
      contributions: [],
      year: 2026,
    });
    expect(renderToStaticMarkup(<ImageAiCredit provenance={partial} />)).toBe("");
    expect(imageAiCreditText(partial)).toBeNull();
  });

  test("rejeita atribuição nominal em estado não verificado", () => {
    expect(() =>
      imageAiProvenanceSchema.parse({
        status: "unverified",
        contributions: [{ role: "generation", tool: "Ferramenta presumida" }],
        year: 2026,
      }),
    ).toThrow();
  });

  test("mantém créditos de texto e imagem semanticamente separados", () => {
    const imageHtml = renderToStaticMarkup(
      <Figure
        src="/imagem.png"
        alt="Imagem de teste"
        aiProvenanceStatus="verified"
        aiGenerationTool="ChatGPT"
        aiCreditYear="2029"
      />,
    );
    const textHtml = renderToStaticMarkup(
      <AiEditorialCredit assistance="limited" publicationDate="2029-05-10" />,
    );

    expect(imageHtml).toContain("Imagem gerada por IA");
    expect(imageHtml).not.toContain("Texto elaborado com auxílio");
    expect(textHtml).toContain("Texto elaborado com auxílio");
    expect(textHtml).not.toContain("Imagem gerada por IA");
  });
});
