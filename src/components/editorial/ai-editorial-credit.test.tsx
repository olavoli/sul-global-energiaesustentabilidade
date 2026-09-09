import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEditorialCredit } from "./AiEditorialCredit";

describe("crédito editorial de IA", () => {
  test("disclosure explícito distingue origem e edição sem concatenar o resumo", () => {
    const disclosure =
      "Origem: Reve (app.reve.com). Edição: ferramenta de imagens do Codex (OpenAI).";
    const html = renderToStaticMarkup(
      <AiEditorialCredit
        assistance="substantial"
        publicationDate="2026-09-03"
        imageTools={["Reve (app.reve.com)"]}
        disclosure={disclosure}
      />,
    );
    expect(html).toContain(disclosure);
    expect(html).not.toContain("Texto e imagens geradas por IA");
  });
  test("aparece automaticamente quando houve auxílio de IA", () => {
    const html = renderToStaticMarkup(
      <AiEditorialCredit assistance="limited" publicationDate="2031-04-17" />,
    );
    expect(html).toContain("Texto elaborado com auxílio de inteligência artificial (IA)");
    expect(html).toContain("Olavo Oliveira, SGES (2031)");
    expect(html).toContain("Nota de Transparência");
  });

  test("consolida texto e imagens somente com ferramenta comprovada", () => {
    const html = renderToStaticMarkup(
      <AiEditorialCredit
        assistance="substantial"
        publicationDate="2026-08-16"
        imageTools={["GPT Image 2, OpenAI"]}
      />,
    );

    expect(html).toContain(
      "Texto e imagens geradas por IA (<em>GPT Image 2, OpenAI</em>), com edição e conferência técnica de Olavo Oliveira, SGES (2026).",
    );
    expect(html.match(/Nota de Transparência/g)).toHaveLength(1);
    expect(html.match(/GPT Image 2, OpenAI/g)).toHaveLength(1);
  });

  test("não atribui IA a artigo marcado como none", () => {
    expect(
      renderToStaticMarkup(<AiEditorialCredit assistance="none" publicationDate="2031-04-17" />),
    ).toBe("");
  });
});
