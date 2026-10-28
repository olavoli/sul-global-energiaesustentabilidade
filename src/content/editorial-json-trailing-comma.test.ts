import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseEditorialFile } from "../../scripts/generate-content";
import { prepareStatusChange } from "../../scripts/editorial-operations";

// In-memory serialization fixtures only. No approval/date is written to a real article.
for (const trailingComma of [false, true]) {
  test(`JSON field insertion preserves content with trailingComma=${trailingComma}`, () => {
    const original = parseEditorialFile(
      readFileSync("content/articles/o-que-e-potencia.mdx", "utf8"),
    );
    const frontmatter = { ...original.frontmatter, status: "review" as const };
    delete frontmatter.approvedAt;
    delete frontmatter.publishedAt;
    const json = JSON.stringify(frontmatter, null, 2).replace(
      /\n}$/,
      trailingComma ? ",\n}" : "\n}",
    );
    const source = `---\n${json}\n---\n${original.body}`;
    const context = { now: new Date("2026-10-28T12:00:00Z"), officialProduction: true };
    const approved = prepareStatusChange(source, "approved", context);
    const approvedRecord = parseEditorialFile(approved.content);
    expect(approvedRecord.frontmatter.status).toBe("approved");
    expect(approvedRecord.frontmatter.approvedAt).toBe("2026-10-28");
    const published = prepareStatusChange(approved.content, "published", context);
    const persistedCandidate = parseEditorialFile(published.content);
    expect(persistedCandidate.frontmatter.status).toBe("published");
    expect(persistedCandidate.frontmatter.publishedAt).toBe("2026-10-28");
    expect(persistedCandidate.frontmatter.sources).toEqual(frontmatter.sources);
    expect(persistedCandidate.frontmatter.cover).toEqual(frontmatter.cover);
    expect(persistedCandidate.frontmatter.tags).toEqual(frontmatter.tags);
    expect(persistedCandidate.frontmatter.author).toBe(frontmatter.author);
    expect(persistedCandidate.body).toBe(original.body);
    expect(published.content).not.toContain(",,");
    const { status, approvedAt, publishedAt, ...rest } = persistedCandidate.frontmatter;
    const { status: initialStatus, ...initialRest } = frontmatter;
    expect([status, initialStatus, approvedAt, publishedAt]).toEqual([
      "published",
      "review",
      "2026-10-28",
      "2026-10-28",
    ]);
    expect(rest).toEqual(initialRest);
  });
}
