import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  loadResearchBrief,
  evaluateResearch,
  researchBriefSchema,
} from "../../scripts/research-operations";
import { parseEditorialFile } from "../../scripts/generate-content";
import { prepareStatusChange, publishCheck } from "../../scripts/editorial-operations";
import { translationSchema } from "./translation-schema";

const slug = "o-que-e-potencia";
const original = parseEditorialFile(readFileSync(`content/articles/${slug}.mdx`, "utf8"));

test("retrospective power research brief satisfies the existing schema with the four documented sources", async () => {
  const brief = researchBriefSchema.parse(await loadResearchBrief(slug));
  const report = evaluateResearch(brief);
  expect(report.readyForWriting).toBe(true);
  expect(report.readyForReview).toBe(true);
  expect(report.blockers).toEqual([]);
  expect(brief.confirmedSources.map((s) => s.url)).toEqual(
    original.frontmatter.sources.map((s) => s.url),
  );
  expect(brief.confirmedSources).toHaveLength(4);
  expect(brief.residualRiskApproval).toBeUndefined();
  expect(brief.scope).toContain("retrospectivamente");
  expect(brief.scope).toContain("não revisão linguística humana");
  expect(brief.factChecks.every((f) => f.status === "confirmed" && f.sourceUrls.length > 0)).toBe(
    true,
  );
  expect(brief.imageRequirements.width).toBe(original.frontmatter.cover.width);
  expect(brief.imageRequirements.height).toBe(original.frontmatter.cover.height);
});

test("real EN/ES drafts can simulate review without mutation, but human approval still blocks approved/publication", async () => {
  const research = evaluateResearch(await loadResearchBrief(slug));
  const context = { now: new Date(), officialProduction: true };
  for (const locale of ["en", "es"] as const) {
    const file = `content/translations/${locale}/${slug}.mdx`;
    const source = readFileSync(file, "utf8");
    const current = translationSchema.parse(parseEditorialFile(source).frontmatter);
    expect(current.status).toBe("draft");
    expect(current.draftStage).toBe("review-ready");
    expect(current.translationReview).toEqual({ status: "pending" });
    const prepared = prepareStatusChange(source, "review", context, undefined, research);
    const candidate = translationSchema.parse(parseEditorialFile(prepared.content).frontmatter);
    expect(candidate.status).toBe("review");
    expect(candidate.translationReview).toEqual({ status: "pending" });
    expect(candidate.reviewedAt).toBeUndefined();
    expect(candidate.approvedAt).toBeUndefined();
    expect(candidate.publishedAt).toBeUndefined();
    expect(parseEditorialFile(prepared.content).body).toBe(parseEditorialFile(source).body);
    expect(() =>
      prepareStatusChange(prepared.content, "approved", context, undefined, research),
    ).toThrow("Tradução exige revisão humana identificada");
    expect(publishCheck(current, context).blockers).toContain(
      "Tradução aguarda revisão editorial humana identificada.",
    );
    expect(readFileSync(file, "utf8")).toBe(source);
  }
});
