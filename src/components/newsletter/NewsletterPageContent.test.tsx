import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultParseSearch } from "@tanstack/react-router";
import { NewsletterPageContent } from "@/components/newsletter/NewsletterPageContent";
import { Route } from "@/routes/newsletter";

function renderReturn(search: Record<string, unknown>) {
  const validate = Route.options.validateSearch;
  if (typeof validate !== "function") throw new Error("Validação de busca ausente.");
  const validated = validate(search);
  const confirmationReturn =
    validated !== null &&
    typeof validated === "object" &&
    "confirmado" in validated &&
    validated.confirmado === 1;
  return renderToStaticMarkup(<NewsletterPageContent confirmationReturn={confirmationReturn} />);
}

test("preserva o título e publica somente as três promessas editoriais aprovadas", () => {
  const html = renderReturn({});
  expect(html).toContain("Uma análise semanal, sem ruído.");
  expect(html).toContain("O que você vai encontrar na newsletter Sul Global:");
  expect(html).toContain("Análises sobre energia, sustentabilidade, ciência e políticas públicas.");
  expect(html).toContain("Uma seleção de artigos e temas relevantes, com contexto e fontes.");
  expect(html).toContain(
    "Reflexões sobre tecnologias, decisões e acontecimentos que ajudam a compreender o mundo.",
  );
  expect(html).toContain("Informação com profundidade, sem excesso de ruído.");
  expect(html).not.toContain("reportagem exclusiva");
  expect(html).not.toContain("Três leituras");
  expect(html).not.toContain("Gráfico da semana");
});

test("retorno aparentemente válido do Kit não comprova sucesso sem contexto do servidor", () => {
  const html = renderReturn(defaultParseSearch("?confirmado=1"));
  expect(html).toContain("Não foi possível verificar sua confirmação nesta página.");
  expect(html).not.toContain("Inscrição confirmada!");
  expect(html).not.toContain("Seu e-mail foi confirmado com sucesso.");
  expect(html).toContain('href="/"');
  expect(html).toContain("Explorar os artigos");
  expect(html).not.toContain("Quero receber");
});

test("dados inválidos da URL não autenticam nem expõem um assinante", () => {
  const html = renderReturn({
    confirmado: "1",
    status: "active",
    email: "private@example.com",
    token: "invalid-proof",
  });
  expect(html).not.toContain("Inscrição confirmada!");
  expect(html).not.toContain("private@example.com");
  expect(html).not.toContain("invalid-proof");
  expect(renderReturn({ confirmado: true })).not.toContain("Confirmação da inscrição");
});

test("alegar expiração na URL não permite inventar validade ou estado da inscrição", () => {
  const html = renderReturn(defaultParseSearch("?confirmado=1&expires=2000-01-01&status=expired"));
  expect(html).toContain("Não foi possível verificar sua confirmação nesta página.");
  expect(html).not.toContain("Inscrição confirmada!");
  expect(html).not.toContain("2000-01-01");
});

test("retorno repetido permanece neutro e não solicita uma nova inscrição", () => {
  const first = renderReturn(defaultParseSearch("?confirmado=1"));
  expect(renderReturn(defaultParseSearch("?confirmado=1"))).toBe(first);
  expect(first).toContain("não é necessário se inscrever novamente");
  expect(first).not.toContain("Quero receber");
});
