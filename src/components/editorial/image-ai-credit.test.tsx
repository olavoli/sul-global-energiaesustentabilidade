import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { imageAiProvenanceSchema } from "@/content/schema";
import { articleAiImageTools, imageAiCreditText } from "@/content/image-ai-credit";
import { AiEditorialCredit } from "./AiEditorialCredit";
import { ImageAiCredit } from "./ImageAiCredit";
import { Figure } from "./MdxComponents";

describe("proveniência de IA em imagens", () => {
  test("exibe somente a fonte SGES e o ano estruturado", () => {
    const provenance = imageAiProvenanceSchema.parse({
      status: "verified",
      contributions: [{ role: "generation", tool: "ChatGPT" }],
      year: 2031,
    });
    const html = renderToStaticMarkup(<ImageAiCredit provenance={provenance} />);

    expect(html).toBe("Fonte: SGES (2031).");
    expect(html).not.toContain("ChatGPT");
    expect(imageAiCreditText(provenance)).toBe("Fonte: SGES (2031).");
  });

  test("preserva a proveniência C2PA sem expor a ferramenta no crédito público", () => {
    const provenance = imageAiProvenanceSchema.parse({
      status: "verified",
      contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
      year: 2026,
    });

    expect(provenance.contributions).toEqual([{ role: "generation", tool: "GPT Image 2, OpenAI" }]);
    expect(imageAiCreditText(provenance)).toBe("Fonte: SGES (2026).");
    expect(renderToStaticMarkup(<ImageAiCredit provenance={provenance} />)).toBe(
      "Fonte: SGES (2026).",
    );
  });

  test("recupera a ferramenta verificada da capa quando o campo agregado não chega ao cliente", () => {
    expect(
      articleAiImageTools({
        aiImageTools: undefined,
        cover: {
          src: "/cover.png",
          alt: "Capa editorial",
          decorative: false,
          aiProvenance: {
            status: "verified",
            contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
            year: 2026,
          },
        },
      }),
    ).toEqual(["GPT Image 2, OpenAI"]);
  });

  test("mantém geração e edição registradas sem detalhá-las visualmente", () => {
    const provenance = imageAiProvenanceSchema.parse({
      status: "verified",
      contributions: [
        { role: "generation", tool: "ChatGPT" },
        { role: "editing", tool: "Adobe Firefly" },
      ],
      year: 2026,
    });

    const html = renderToStaticMarkup(<ImageAiCredit provenance={provenance} />);
    expect(provenance.contributions).toHaveLength(2);
    expect(html).toBe("Fonte: SGES (2026).");
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

    expect(imageHtml).toContain("Fonte: SGES (2029).");
    expect(imageHtml).not.toContain("Imagem gerada por IA");
    expect(imageHtml).not.toContain("Texto elaborado com auxílio");
    expect(textHtml).toContain("Texto elaborado com auxílio");
    expect(textHtml).not.toContain("Imagem gerada por IA");
  });
});
