import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { getArticleBySlug, getPublishedArticles } from "./repository";

const slug = "baterias-de-sodio-estao-chegando";
const source = readFileSync(new URL(`../../content/articles/${slug}.mdx`, import.meta.url), "utf8");

describe("ART-005 — Baterias de sódio", () => {
  test("é conteúdo real, publicado e acessível pelo slug", async () => {
    const article = await getArticleBySlug(slug);
    expect(article?.isDemo).toBeFalse();
    expect(article?.status).toBe("published");
    expect(getPublishedArticles().some((item) => item.slug === slug)).toBeTrue();
  });

  test("preserva fontes rastreáveis sem parâmetros de campanha", () => {
    expect(source).toContain("Sodium-ion battery momentum grows");
    expect(source).toContain("Next-generation anodes");
    expect(source).toContain("Segundo a própria CATL");
    expect(source).not.toContain("utm_source");
  });

  test("qualifica comparações e não publica métricas heterogêneas da arte original", () => {
    expect(source).toContain("não o resultado de um único ensaio comparativo");
    expect(source).toContain("Não constituem comparação experimental direta");
    expect(source).not.toContain("2.000 – 4.000+");
    expect(source).not.toContain("baixo a médio");
  });

  test("inclui fontes PNG e derivados WebP das três figuras", () => {
    for (const name of [
      "art-005-bateria-sodio-hero",
      "art-005-litio-vs-sodio-editorial",
      "art-005-densidade-energetica-editorial",
    ]) {
      for (const suffix of [".png", "-720.webp", "-1200.webp", "-1536.webp"]) {
        expect(
          existsSync(
            new URL(`../../public/images/articles/${slug}/${name}${suffix}`, import.meta.url),
          ),
        ).toBeTrue();
      }
    }
  });
});
