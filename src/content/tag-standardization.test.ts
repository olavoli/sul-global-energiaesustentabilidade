import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import report from "../../docs/editorial/padronizacao-tags-2026-10-12.json";
import { articleRecords } from "./generated/articles";

function protectedHash(slug: string, source: string) {
  // Only the approved ART-031 frontmatter insertion is exempt from the historical hash.
  const approvedInsertion = /^---\r?\n[\s\S]*?\r?\n---/.exec(source)?.[0];
  if (slug === "a-pandemia-salvou-o-sus" && approvedInsertion) {
    source = source.replace(
      approvedInsertion,
      approvedInsertion.replace(
        /\nfeatured: false\r?\nreferencesInBody: true\r?\nisDemo: false(?=\r?\n)/,
        "\nfeatured: false\nisDemo: false",
      ),
    );
  }
  return createHash("sha256")
    .update(
      source
        .replace(/^tags:[^\r\n]*(?:\r?\n[ \t]+[^\r\n]*)*/m, "<TAGS>")
        .replace(/^ {2}"tags": \[[\s\S]*?\],/m, "<TAGS>")
        .replace(/\r\n/g, "\n"),
    )
    .digest("hex");
}

test("padronização preserva o conteúdo e os metadados fora das tags nos 31 artigos", () => {
  expect(report.records).toHaveLength(31);
  for (const record of report.records) {
    const source = readFileSync(`content/articles/${record.slug}.mdx`, "utf8");
    expect(protectedHash(record.slug, source)).toBe(record.protectedContentSha256);
    const frontmatter = parse(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1]);
    expect(frontmatter.tags).toEqual(record.afterTags);
    expect(frontmatter.category).toBe(record.category);
    expect(frontmatter.status).toBe("published");
    expect<Array<string> | undefined>(
      articleRecords.find((article) => article.slug === record.slug)?.tags,
    ).toEqual(record.afterTags);
    expect(new Set(record.afterTags).size).toBe(record.afterTags.length);
    expect(record.afterTags.length).toBeGreaterThanOrEqual(3);
    expect(record.afterTags.length).toBeLessThanOrEqual(8);
    if (record.afterTags.length > 5) expect(record.exception).toBeTruthy();
  }
});

test("exceção ART-031 não aceita outros valores, campos, duplicações ou alterações de conteúdo", () => {
  const slug = "a-pandemia-salvou-o-sus";
  const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
  const historical = report.records.find((record) => record.slug === slug)!.protectedContentSha256;
  expect(protectedHash(slug, source)).toBe(historical);
  for (const changed of [
    source.replace("referencesInBody: true", "referencesInBody: false"),
    source.replace("referencesInBody: true", "referencesInBody: true\nreferencesInBody: true"),
    source.replace("referencesInBody: true", "referencesInBody: true\nunapproved: true"),
    source.replace("## Referências Bibliográficas", "## Bibliografia alterada"),
    source + "\nTexto não autorizado.\n",
  ])
    expect(protectedHash(slug, changed)).not.toBe(historical);
  for (const record of report.records.filter((record) => record.slug !== slug)) {
    const original = readFileSync(`content/articles/${record.slug}.mdx`, "utf8");
    expect(protectedHash(record.slug, original)).toBe(record.protectedContentSha256);
    expect(
      protectedHash(
        record.slug,
        original.replace(/^featured: false/m, "featured: false\nreferencesInBody: true") +
          "\nAlteração não autorizada.\n",
      ),
    ).not.toBe(record.protectedContentSha256);
  }
});

test("siglas de busca permanecem nas etiquetas consolidadas", () => {
  expect(
    report.records.find((r) => r.slug === "uma-bateria-precisa-mesmo-ser-pequena")?.afterTags,
  ).toContain("armazenamento de longa duração (ldes)");
  expect(
    report.records.find(
      (r) => r.slug === "por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao",
    )?.afterTags,
  ).toContain("restrição de geração (curtailment)");
});
