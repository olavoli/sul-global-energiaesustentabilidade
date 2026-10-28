import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { compile, run } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { parseEditorialFile } from "../../scripts/generate-content";
import { editorialDeterministic } from "../../scripts/i18n-operations/editorial";
import { translationRecords } from "./generated/translations";
import { findTranslation, publishedTranslations } from "./i18n";
import { translationSchema, type TranslationRecord } from "./translation-schema";
import { generateSitemap, generateRss } from "@/lib/distribution";
import { getPublishedArticles } from "./repository";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { EditorialLocaleContext } from "./locale-context";

const slug = "o-que-e-potencia";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const pt = parseEditorialFile(source);
const records: readonly TranslationRecord[] = translationRecords.filter(
  (record) => record.translationOf === slug,
);
const refs = (body: string) =>
  body.split(/^## (?:Referências|References|Referencias)\s*$/m)[1].trim();
const paths = (body: string) =>
  [...body.matchAll(/(?:src|source720|source1200|sourceFull)="([^"]+)"|\]\(([^)]+)\)/g)].map(
    (m) => m[1] ?? m[2],
  );

test("power editions remain pending drafts, with original attribution, source hash and references", () => {
  expect(records).toHaveLength(2);
  for (const record of records) {
    expect(translationSchema.safeParse(record).success).toBe(true);
    expect(record.status).toBe("draft");
    expect(record.translationReview).toEqual({ status: "pending" });
    expect("approvedAt" in record).toBe(false);
    expect("publishedAt" in record).toBe(false);
    expect(record.sourceRevision).toBe(
      createHash("sha256").update(source.replace(/\r\n/g, "\n")).digest("hex"),
    );
    expect(record.author).toBe(pt.frontmatter.author);
    expect(record.category).toBe(pt.frontmatter.category);
    expect(record.tags).toEqual(pt.frontmatter.tags);
    expect(record.sources).toEqual(pt.frontmatter.sources);
    expect(record.cover.sources).toEqual(pt.frontmatter.cover.sources);
    expect(record.cover.license).toBe(pt.frontmatter.cover.license);
    expect(record.aiDisclosureMode).toBe("detailed");
    expect(record.aiDisclosure).toContain(
      record.locale === "en" ? "Publication was authorized" : "autorizó su publicación",
    );
    expect(record.aiDisclosure).toContain(
      record.locale === "en"
        ? "No full human linguistic review"
        : "No se declara una revisión lingüística humana integral",
    );
    expect(record.aiDisclosure).toContain("Cloudflare Workers AI (Meta Llama 3.3 70B)");
    expect(record.aiDisclosure).toContain(
      record.locale === "en" ? "review is pending" : "está pendiente",
    );
    for (const field of [
      record.title,
      record.subtitle,
      record.excerpt,
      record.seoTitle,
      record.seoDescription,
      record.cover.alt,
      record.cover.caption,
    ])
      expect(field?.length).toBeGreaterThan(10);
    expect(findTranslation(record.locale, record.slug)).toBeUndefined();
    expect(publishedTranslations().some((a) => a.translationOf === slug)).toBe(false);
    expect(generateSitemap(getPublishedArticles())).not.toContain(record.canonicalUrl);
    expect(generateRss(publishedTranslations(), true, record.locale)).not.toContain(
      record.canonicalUrl,
    );
  }
});

test("power drafts preserve MDX, equations, numerical values, units, links and source assets", () => {
  for (const record of records) {
    const parsed = parseEditorialFile(
      readFileSync(`content/translations/${record.locale}/${slug}.mdx`, "utf8"),
    );
    expect(
      editorialDeterministic(pt.body, parsed.body, record.locale).filter(
        (f) => f.severity === "critical",
      ),
    ).toEqual([]);
    expect(refs(parsed.body)).toBe(refs(pt.body));
    expect(paths(parsed.body)).toEqual(paths(pt.body));
    for (const path of paths(parsed.body).filter((p) => p.startsWith("/images/")))
      expect(readFileSync(`public${path}`).length).toBeGreaterThan(0);
    const formulas = (body: string) =>
      [...body.matchAll(/\*\*([^*\r\n]*=[^*\r\n]*)\*\*/g)].map((m) =>
        m[1].replace(/(\d),(\d)/g, "$1.$2"),
      );
    expect(formulas(parsed.body)).toEqual(formulas(pt.body));
    expect(parsed.body.match(/<Figure\b/g)).toHaveLength(1);
    expect(parsed.body.match(/<Callout\b/g)).toHaveLength(1);
    expect(parsed.body.match(/<KeyPoints>/g)).toHaveLength(1);
    expect(parsed.body).toContain(
      record.locale === "en" ? "In the second case," : "En el segundo caso,",
    );
    expect(parsed.body).toContain(record.locale === "en" ? "3,600 seconds" : "3.600 segundos");
    expect(parsed.body).toContain(record.locale === "en" ? "1 kWh = 3.6 MJ" : "1 kWh = 3,6 MJ");
    expect(parsed.body).toContain(record.locale === "en" ? "(in Portuguese)" : "(en portugués)");
    expect(parsed.body).not.toContain("A more powerful equipment");
    expect(parsed.body).not.toMatch(/quilovatio/i);
  }
});

test("both complete drafts compile and render using the actual editorial components", async () => {
  for (const record of records) {
    const raw = readFileSync(`content/translations/${record.locale}/${slug}.mdx`, "utf8");
    const module = await run(
      String(
        await compile(raw, { outputFormat: "function-body", remarkPlugins: [remarkFrontmatter] }),
      ),
      { ...runtime, baseUrl: import.meta.url },
    );
    const html = renderToStaticMarkup(
      <EditorialLocaleContext.Provider value={record.locale}>
        <module.default components={editorialMdxComponents} />
      </EditorialLocaleContext.Provider>,
    );
    expect(html).toContain(record.locale === "en" ? "Key takeaways" : "Puntos clave");
    expect(html).toContain(record.locale === "en" ? "References" : "Referencias");
    expect(html).toContain(
      record.locale === "en" ? "Why is no machine 100% efficient?" : "¿Qué es la potencia?",
    );
    expect(html).toContain("ΔE / Δt");
    expect(html).not.toContain("@@");
  }
});
