import { ArticlePermalink } from "@/components/article/ArticlePermalink";
import { resolveCanonical } from "@/lib/seo";
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { compile, run } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import * as runtime from "react/jsx-runtime";
import { translationRecords } from "./generated/translations";
import {
  translationSchema,
  translatedArticlePath,
  type TranslationRecord,
} from "./translation-schema";
import {
  publishedTranslations,
  articleAlternates,
  languageOptions,
  languageForPath,
  findTranslation,
} from "./i18n";
import { getPublishedArticles } from "./repository";
import { generateRss, generateSitemap } from "@/lib/distribution";
import { translatedHead, loadTranslatedArticle } from "@/lib/translation-page";
import { LanguageLinks } from "@/components/navigation/LanguageSelector";
import { EditorialLocaleContext } from "./locale-context";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { parseEditorialFile } from "../../scripts/generate-content";
import { publishCheck } from "../../scripts/editorial-operations";

const original = "terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1";
const records: readonly TranslationRecord[] = translationRecords.filter(
  (record) => record.translationOf === original,
);
const ptSource = readFileSync(`content/articles/${original}.mdx`, "utf8").replace(/\r\n/g, "\n");
const pt = parseEditorialFile(ptSource);
// Approved records below are in-memory fixtures only, never persisted or exposed by routes.
const approved: TranslationRecord[] = records.map((record) =>
  translationSchema.parse({
    ...record,
    status: "published",
    approvedAt: "2026-10-24",
    publishedAt: "2026-10-24",
    translationReview: {
      status: "approved",
      reviewer: "Fixture reviewer",
      reviewedAt: "2026-10-24",
    },
  }),
);

test("PT mantém URL e conteúdo; EN/ES são drafts completos fora das rotas públicas", () => {
  expect(getPublishedArticles().some((a) => a.slug === original)).toBe(true);
  expect(pt.frontmatter.canonicalUrl).toBe(`/artigo/${original}`);
  expect(records).toHaveLength(2);
  for (const record of records) {
    expect(record.status).toBe("draft");
    expect(record.sourceRevision).toBe(createHash("sha256").update(ptSource).digest("hex"));
    expect(record.translationReview.status).toBe("pending");
    expect(record.author).toBe(pt.frontmatter.author);
    expect(record.sources).toEqual(pt.frontmatter.sources);
    expect(record.cover.src).toBe(pt.frontmatter.cover.src);
    expect(findTranslation(record.locale, record.slug)).toBeUndefined();
    expect(() => loadTranslatedArticle(record.locale, record.slug)).toThrow();
    expect(
      publishCheck(
        parseEditorialFile(
          readFileSync(`content/translations/${record.locale}/${record.slug}.mdx`, "utf8"),
        ).frontmatter,
        { now: new Date("2026-10-24"), officialProduction: true },
      ).blockers,
    ).toContain("Tradução aguarda revisão editorial humana identificada.");
    expect(
      translationSchema.safeParse({
        ...record,
        status: "published",
        publishedAt: "2026-10-24",
        approvedAt: "2026-10-24",
      }).success,
    ).toBe(false);
  }
  expect(publishedTranslations()).toHaveLength(0);
});

test("canonical próprio, hreflang recíproco e x-default PT após aprovação explícita", () => {
  const alternatives = articleAlternates(original, approved);
  expect(alternatives.map((a) => a.hrefLang)).toEqual(["pt-BR", "en", "es", "x-default"]);
  expect(alternatives.find((a) => a.hrefLang === "x-default")?.href).toBe(alternatives[0].href);
  for (const article of publishedTranslations(approved)) {
    expect(loadTranslatedArticle(article.locale, article.slug, approved).article.slug).toBe(
      article.slug,
    );
    expect(article.canonicalUrl).toBe(translatedArticlePath(article.locale, article.slug));
    const permalink = renderToStaticMarkup(
      <ArticlePermalink article={article}>{article.title}</ArticlePermalink>,
    );
    expect(permalink).toContain(`href="${article.canonicalUrl}"`);
    const head = translatedHead(article, approved);
    expect(head.links?.filter((l) => l.rel === "alternate")).toEqual(alternatives);
    expect(head.links?.find((l) => l.rel === "canonical")?.href).toEndWith(
      article.canonicalUrl ?? "",
    );
    expect(
      head.meta.some(
        (m) =>
          "property" in m &&
          m.property === "og:locale" &&
          m.content === (article.locale === "en" ? "en_US" : "es_ES"),
      ),
    ).toBe(true);
    expect(JSON.parse(head.scripts?.[0].children ?? "{}").inLanguage).toBe(article.locale);
  }
  expect(articleAlternates(original).map((a) => a.hrefLang)).toEqual(["pt-BR", "x-default"]);
});

test("sitemap lista somente traduções aprovadas, alternates equivalentes e feeds separados", () => {
  const articles = getPublishedArticles();
  const pendingMap = generateSitemap(articles);
  const publicMap = generateSitemap(articles, true, approved);
  for (const record of approved) {
    expect(pendingMap).not.toContain(record.canonicalUrl ?? "UNEXPECTED");
    expect(publicMap).toContain(`<loc>${resolveCanonical(record.canonicalUrl ?? "")}</loc>`);
    expect(publicMap).toContain(`hreflang="${record.locale}"`);
    expect(generateRss(articles)).not.toContain(record.slug);
    expect(
      generateRss(
        publishedTranslations(approved).filter((a) => a.locale === record.locale),
        true,
        record.locale,
      ),
    ).toContain(`<language>${record.locale}</language>`);
  }
  expect(generateSitemap(articles, false, approved)).not.toContain("<url>");
});

test("seletor funciona sem JS de tradução, com fallback explícito e links equivalentes", () => {
  const path = `/artigo/${original}`;
  expect(languageOptions(path).map((o) => o.href)).toEqual([path, "/en", "/es"]);
  expect(languageOptions(path).filter((o) => o.fallback)).toHaveLength(2);
  expect(languageOptions("/artigo/a-pandemia-salvou-o-sus")[0].href).toBe(
    "/artigo/a-pandemia-salvou-o-sus",
  );
  for (const option of languageOptions(path, approved)) expect(option.fallback).toBe(false);
  const es = approved.find((r) => r.locale === "es");
  expect(es).toBeDefined();
  if (!es) throw new Error("Fixture ES ausente");
  expect(languageOptions(es.canonicalUrl ?? "", approved)[0].href).toBe(path);
  expect(languageForPath(es.canonicalUrl ?? "")).toBe("es");
  const html = renderToStaticMarkup(<LanguageLinks pathname={path} />);
  expect(html).toContain("<details");
  expect(html).toContain("<summary");
  expect(html).toContain("tradução indisponível");
  expect(html).toContain('href="/en"');
  expect(html).not.toContain("<script");
});

test("traduções preservam todos os blocos, números, 14 referências e quatro imagens", async () => {
  const refs = pt.body.split("## Referências")[1].trim();
  for (const record of records) {
    const source = readFileSync(`content/translations/${record.locale}/${record.slug}.mdx`, "utf8");
    const parsed = parseEditorialFile(source);
    expect(parsed.body.split(/## (?:References|Referencias)/)[1].trim()).toBe(refs);
    expect([...parsed.body.matchAll(/^## /gm)]).toHaveLength(11);
    expect(parsed.body.match(/<Figure\b/g)).toHaveLength(3);
    expect(parsed.body.match(/<Callout\b/g)).toHaveLength(1);
    expect(parsed.body.split("</KeyPoints>")[0].match(/^- /gm)).toHaveLength(5);
    const paragraphs = (text: string) =>
      text
        .split(/## (?:Referências|References|Referencias)/)[0]
        .replace(/<Figure\b[\s\S]*?\/>/g, "")
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p && !/^(?:<|##|- )/.test(p));
    expect(paragraphs(parsed.body)).toHaveLength(paragraphs(pt.body).length);
    const citations = (text: string) =>
      [
        ...text
          .split(/## (?:Referências|References|Referencias)/)[0]
          .matchAll(/\[(\d+(?:(?:,\s*|[–-])\d+)*)\]/g),
      ].map((m) => m[1]);
    expect(citations(parsed.body)).toEqual(citations(pt.body));
    for (const value of [
      "21",
      "60%",
      "91%",
      "94%",
      "95%",
      "326",
      "2024",
      "2025",
      "4f",
      "Ni-MH",
      "NdFeB",
    ])
      expect(parsed.body).toContain(value);
    expect(parsed.body).toMatch(/485[.,]4%/);
    expect(parsed.body).toContain("[1, 14]");
    expect(record.aiDisclosure).toContain("ChatGPT (OpenAI)");
    expect(record.aiDisclosure).toContain("Pippit");
    const module = await run(
      String(
        await compile(source, {
          outputFormat: "function-body",
          remarkPlugins: [remarkFrontmatter],
        }),
      ),
      { ...runtime, baseUrl: import.meta.url },
    );
    const html = renderToStaticMarkup(
      <EditorialLocaleContext.Provider value={record.locale}>
        <module.default components={editorialMdxComponents} />
      </EditorialLocaleContext.Provider>,
    );
    expect(html.match(/<figcaption/g)).toHaveLength(3);
    expect(html).toContain(record.locale === "en" ? "Key takeaways" : "Puntos clave");
    expect(html).not.toContain("@@FIG");
  }
});

test("revisão ART-033: números por seção, ativos e proveniência coincidem com PT", () => {
  const sections = (body: string) => body.split(/^## .*$/gm);
  const numericValues = (body: string) =>
    [...body.matchAll(/\d+(?:[.,]\d+)?/g)].map(([value]) =>
      Number(
        /^[0-9]+[.,][0-9]{3}$/.test(value) ? value.replace(/[.,]/, "") : value.replace(",", "."),
      ),
    );
  const figures = (body: string) =>
    [...body.matchAll(/<Figure\b[\s\S]*?\/>/g)].map(([figure]) => ({
      assets: [...figure.matchAll(/(?:src|source720|source1200|sourceFull)="([^"]+)"/g)].map(
        (m) => m[1],
      ),
      provenance: [
        ...figure.matchAll(/(?:aiProvenanceStatus|aiGenerationTool|aiCreditYear)="([^"]+)"/g),
      ].map((m) => m[1]),
    }));
  for (const record of records) {
    const parsed = parseEditorialFile(
      readFileSync(`content/translations/${record.locale}/${record.slug}.mdx`, "utf8"),
    );
    const translatedSections = sections(parsed.body);
    const originalSections = sections(pt.body);
    expect(translatedSections).toHaveLength(originalSections.length);
    originalSections.forEach((section, index) =>
      expect(numericValues(translatedSections[index]).sort((a, b) => a - b)).toEqual(
        numericValues(section).sort((a, b) => a - b),
      ),
    );
    expect(figures(parsed.body)).toEqual(figures(pt.body));
    expect(record.cover.sources).toEqual(pt.frontmatter.cover.sources);
    expect(record.cover.aiProvenance).toEqual(pt.frontmatter.cover.aiProvenance);
    expect(record.cover.license).toBe(pt.frontmatter.cover.license);
    expect(record.translationReview).toEqual({ status: "pending" });
    expect(record.approvedAt).toBeUndefined();
    expect(record.publishedAt).toBeUndefined();
    expect(parsed.body).toContain(
      record.locale === "en"
        ? "The original edition uses an estimate"
        : "La edición original utiliza una estimación",
    );
    expect(parsed.body).toContain(
      record.locale === "en" ? "mineral exploration permits" : "permisos de exploración minera",
    );
    expect(parsed.body).not.toContain("datos fiscales de la ANM");
  }
});
