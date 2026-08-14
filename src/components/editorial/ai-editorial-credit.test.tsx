import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AiEditorialCredit } from "./AiEditorialCredit";

describe("crédito editorial de IA", () => {
  test("aparece automaticamente quando houve auxílio de IA", () => {
    const html = renderToStaticMarkup(
      <AiEditorialCredit assistance="limited" publicationDate="2031-04-17" />,
    );
    expect(html).toContain("Texto elaborado com auxílio de inteligência artificial (IA)");
    expect(html).toContain("Olavo Oliveira, SGES (2031)");
    expect(html).toContain("Transparência editorial");
  });

  test("não atribui IA a artigo marcado como none", () => {
    expect(
      renderToStaticMarkup(<AiEditorialCredit assistance="none" publicationDate="2031-04-17" />),
    ).toBe("");
  });
});
