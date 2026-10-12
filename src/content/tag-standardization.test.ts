import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import report from "../../docs/editorial/padronizacao-tags-2026-10-12.json";
import { articleRecords } from "./generated/articles";

test("padronização preserva o conteúdo e os metadados fora das tags nos 31 artigos", () => {
  expect(report.records).toHaveLength(31);
  for (const record of report.records) {
    const source = readFileSync(`content/articles/${record.slug}.mdx`, "utf8");
    const protectedSource = source
      .replace(/^tags:[^\r\n]*(?:\r?\n[ \t]+[^\r\n]*)*/m, "<TAGS>")
      .replace(/^ {2}"tags": \[[\s\S]*?\],/m, "<TAGS>")
      .replace(/\r\n/g, "\n");
    expect(createHash("sha256").update(protectedSource).digest("hex")).toBe(
      record.protectedContentSha256,
    );
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
