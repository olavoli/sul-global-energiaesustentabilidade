import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Route } from "@/routes/privacidade";

test("privacidade declara publicidade e limitações reais, sem prometer ausência de rastreamento", () => {
  const component = Route.options.component;
  if (!component || typeof component !== "function") {
    throw new Error("A rota de privacidade deve fornecer seu componente de apresentação.");
  }
  const html = renderToStaticMarkup(createElement(component));
  expect(html).toContain("Adsterra de 160 × 600");
  expect(html).toContain("1440 pixels");
  expect(html).toContain("bicea.org");
  expect(html).toContain('href="https://adsterra.com/privacy-policy-managed/"');
  expect(html).toContain('href="https://adsterra.com/cookies/"');
  expect(html).toContain("não há um controle de consentimento publicitário");
  expect(html).toContain("não autorizam esse carregamento");
  expect(html).not.toContain("não há cookies não essenciais ativos");
  expect(html).not.toContain("não utiliza tags de analytics de audiência ou publicidade ativa");
  expect(html).toContain("sul-global-theme");
  expect(html).toContain("Comentários públicos");
});
