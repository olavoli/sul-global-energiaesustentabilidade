import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

import { loadEditorialFiles } from "../../scripts/editorial-operations";
import { articleRecords } from "./generated/articles";
import { articleFrontmatterSchema, canonicalSourceUrls, sourceUrlDivergence } from "./schema";

describe("contrato canônico de fontes editoriais", () => {
  test("todos os registros gerados preservam as fontes do parsing", async () => {
    const files = await loadEditorialFiles();
    for (const { frontmatter } of files) {
      const generated = articleRecords.find(({ slug }) => slug === frontmatter.slug);
      expect(generated).toBeDefined();
      const normalized = articleFrontmatterSchema.parse(generated);
      expect(normalized.sources).toEqual(frontmatter.sources);
      expect(canonicalSourceUrls(normalized)).toEqual(frontmatter.sources.map(({ url }) => url));
      expect(normalized.sourceUrls).toEqual(frontmatter.sourceUrls);
    }
  });

  test("artigos publicados usam somente sources, sem divergência legada", async () => {
    const files = await loadEditorialFiles();
    const published = files.filter(({ frontmatter }) => frontmatter.status === "published");
    for (const { frontmatter } of published) {
      expect(frontmatter.sourceUrls).toBeUndefined();
      expect(sourceUrlDivergence(frontmatter)).toBeUndefined();
    }
  });

  test("templates novos não exigem sourceUrls", async () => {
    for (const template of ["analysis", "explainer", "guide", "interview", "news", "opinion"]) {
      const source = await readFile(`content/templates/${template}.mdx`, "utf8");
      expect(source).not.toMatch(/^sourceUrls:/m);
      expect(source).toMatch(/^sources: \[\]/m);
    }
  });
});
