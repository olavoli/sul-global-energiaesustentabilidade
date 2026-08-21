import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";
import { createContentRepository } from "./repository";
import { articleRecords } from "./generated/articles";

const articlePath = new URL("../../content/articles/o-que-e-energia.mdx", import.meta.url);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, "content/articles/o-que-e-energia.mdx");
const repository = createContentRepository(articleRecords, false, "2026-08-05");

describe("Artigo 001 — O que é energia?", () => {
  test("possui frontmatter real, publicado e validado pelo schema", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "o-que-e-energia",
      title: "O que é energia?",
      contentType: "explainer",
      status: "published",
      author: "olavo-oliveira",
      category: "energia",
      publishedAt: "2026-08-05",
      updatedAt: "2026-08-05",
      isDemo: false,
      aiAssistance: "limited",
    });
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
  });

  test("é encontrado pelo repositório, busca e categoria Energia", () => {
    expect(repository.getArticleBySlug("o-que-e-energia")?.title).toBe("O que é energia?");
    expect(repository.searchArticles("energia").map(({ slug }) => slug)).toContain(
      "o-que-e-energia",
    );
    expect(repository.searchArticles("O que é energia?").map(({ slug }) => slug)).toContain(
      "o-que-e-energia",
    );
    expect(repository.getArticlesByCategory("energia").map(({ slug }) => slug)).toContain(
      "o-que-e-energia",
    );
  });

  test("preserva título, seções, resumo e referências canônicas", () => {
    for (const text of [
      "## O que é energia?",
      "## Como a energia se transforma?",
      "## A energia pode desaparecer?",
      "## Em resumo",
      "## Perguntas frequentes",
      "Halliday, Resnick e Walker",
      "Bureau International des Poids et Mesures",
    ]) {
      expect(parsed.body).toContain(text);
    }
    expect(parsed.body).not.toContain("conteúdo fictício");
    expect(parsed.body).not.toContain("F001");
  });

  test("usa três raster editoriais responsivos com acessibilidade, legenda e crédito", () => {
    const figureSources = [
      "art-001-o-que-e-energia-editorial.png",
      "art-001-hidreletrica-transformacoes-editorial.png",
      "art-001-conservacao-energia-editorial.png",
    ];
    expect(parsed.frontmatter.cover.src).toContain(figureSources[0]);
    expect(parsed.body).toContain(figureSources[1]);
    expect(parsed.body).toContain(figureSources[2]);
    expect((source.match(/Fonte: Elaboração própria \(SGES, 2026\)\./g) ?? []).length).toBe(3);

    expect(parsed.frontmatter.cover.sources).toHaveLength(3);
    expect(source).not.toContain("outras perdas");

    for (const filename of figureSources) {
      expect(() =>
        readFileSync(
          new URL(`../../public/images/articles/o-que-e-energia/${filename}`, import.meta.url),
        ),
      ).not.toThrow();
    }
  });

  test("aviso fictício fica condicionado apenas aos artigos demo", () => {
    const rootRoute = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
    const articleRoute = readFileSync(
      new URL("../routes/artigo.$slug.tsx", import.meta.url),
      "utf8",
    );
    expect(rootRoute).not.toContain("DemoContentNotice");
    expect(articleRoute).toContain("<DemoContentNotice visible={article.isDemo} />");
    expect(
      articleRecords
        .filter(
          ({ slug }) =>
            slug !== "o-que-e-energia" &&
            slug !== "o-que-e-potencia" &&
            slug !== "baterias-de-sodio-estao-chegando" &&
            slug !== "fusao-nuclear-esta-mais-perto-mas-perto-de-que" &&
            slug !== "temos-energia-por-que-nao-conseguimos-conecta-la-a-rede" &&
            slug !== "geotermia-de-nova-geracao" &&
            slug !== "perovskita-silicio-por-que-empilhar-duas-celulas-solares" &&
            slug !== "uma-bateria-precisa-mesmo-ser-pequena" &&
            slug !== "o-que-acontece-com-um-painel-solar-no-fim-da-vida" &&
            slug !== "a-transicao-energetica-vai-ficar-sem-cobre" &&
            slug !== "por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao" &&
            slug !== "por-que-armazenar-energia-e-tao-dificil" &&
            slug !== "por-que-nenhuma-maquina-e-100-eficiente" &&
            slug !== "rascunho-como-funciona-matriz-eletrica-brasileira",
        )
        .every(({ isDemo }) => isDemo),
    ).toBeTrue();
  });
});
