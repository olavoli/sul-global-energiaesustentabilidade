import { protectedEquation } from "../i18n-cloudflare-experiment/experiment";
import { z } from "zod";
import { hash, prepare, type Locale } from "../i18n-simulation/pipeline";
import { editorialDeterministic, editorialWarnings, portugueseLinkWarnings } from "./editorial";
import { scientificTokensMatch } from "./automatic-science";
const digest = z.string().regex(/^[a-f0-9]{64}$/);
/** Editorial authorization only: never enables inference, financial authorization or deployment. */
export const editorialPolicySchema = z
  .object({
    version: z.literal("translation-editorial-v1"),
    mode: z.literal("automatic-ai-assisted"),
    sourceLocale: z.literal("pt-BR"),
    targetLocales: z.tuple([z.literal("en"), z.literal("es")]),
    sourceStatus: z.literal("published"),
    authorizedBy: z.string().min(2),
    authorizationRecord: z.string().min(10),
    executionMode: z.literal("free-only"),
    humanReview: z.literal("not-claimed"),
    unresolvedMeaning: z.literal("review-required"),
    continuousActivation: z.literal(false),
    acceptedLimitations: z.tuple([
      z.literal("labelled-portuguese-links"),
      z.literal("original-image-text"),
      z.literal("partial-interface-localization"),
    ]),
  })
  .strict();
export type EditorialPolicy = z.infer<typeof editorialPolicySchema>;
export const meaningEvidenceSchema = z
  .object({
    version: z.literal("meaning-evidence-v1"),
    locale: z.enum(["en", "es"]),
    sourceRevision: digest,
    targetBodyRevision: digest,
    method: z.literal("ai-assisted-grounded-comparison"),
    humanReview: z.literal(false),
    certification: z.literal(false),
    findings: z
      .array(
        z
          .object({
            id: z.string(),
            sourceQuote: z.string().min(1),
            targetQuote: z.string().min(1),
            outcome: z.enum(["equivalent", "uncertain", "contradiction"]),
            rationale: z.string().min(10),
            resolvedSignals: z.array(z.literal("negation-modality-mineral-caveat")).default([]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export function meaningMetadata(f: {
  title: string;
  subtitle?: string;
  excerpt: string;
  seoTitle?: string;
  seoDescription?: string;
  cover: { alt: string; caption?: string };
}): Record<string, string> {
  const values: Record<string, string> = {
    "meta:title": f.title,
    "meta:subtitle": f.subtitle ?? "",
    "meta:excerpt": f.excerpt,
    "meta:seoTitle": f.seoTitle ?? "",
    "meta:seoDescription": f.seoDescription ?? "",
    "cover:alt": f.cover.alt,
    "cover:caption": f.cover.caption ?? "",
  };
  return Object.fromEntries(Object.entries(values).filter(([, text]) => Boolean(text.trim())));
}
export type MeaningEvidence = z.infer<typeof meaningEvidenceSchema>;
export const policyHash = (p: unknown) => hash(JSON.stringify(editorialPolicySchema.parse(p)));
export const bodyRevision = (body: string) => hash(body.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, ""));
/** Reports must cover every source leaf exactly once, with literal grounded quote pairs. */
export function verifyMeaning(
  source: string,
  target: string,
  locale: Locale,
  revision: string,
  raw: unknown,
  metadata: { source: Record<string, string>; target: Record<string, string> },
) {
  const e = meaningEvidenceSchema.parse(raw),
    s = prepare(source),
    t = prepare(target);
  if (
    e.locale !== locale ||
    e.sourceRevision !== revision ||
    e.targetBodyRevision !== bodyRevision(target)
  )
    throw Error("editorial-meaning-stale");
  const leaves = [
    ...s.segments,
    ...Object.entries(metadata.source).map(([id, text]) => ({ id, text })),
  ];
  const targets = [
    ...t.segments,
    ...Object.entries(metadata.source).map(([id]) => ({ id, text: metadata.target[id] })),
  ];
  if (
    e.findings.length !== leaves.length ||
    t.segments.length !== s.segments.length ||
    new Set(e.findings.map((f) => f.id)).size !== leaves.length
  )
    throw Error("editorial-meaning-coverage");
  for (const [i, leaf] of leaves.entries()) {
    const f = e.findings.find((f) => f.id === leaf.id);
    if (!f || f.sourceQuote !== leaf.text || f.targetQuote !== targets[i].text)
      throw Error("editorial-meaning-ungrounded");
    if (f.outcome === "contradiction") throw Error("editorial-meaning-contradiction");
    if (f.outcome !== "equivalent") throw Error("editorial-meaning-review-required");
  }
  return hash(JSON.stringify(e));
}
/** Reuse structural guards and quarantine any unresolved semantic or linguistic warning. */
export function evaluatePolicy(
  source: string,
  target: string,
  locale: Locale,
  revision: string,
  rawPolicy: unknown,
  evidence: unknown,
  metadata: { source: Record<string, string>; target: Record<string, string> },
) {
  const policy = editorialPolicySchema.parse(rawPolicy);
  if (
    JSON.stringify(Object.keys(metadata.source).sort()) !==
    JSON.stringify(Object.keys(metadata.target).sort())
  )
    throw Error("editorial-metadata-coverage");
  const s = prepare(source).segments,
    t = prepare(target).segments;
  if (s.length !== t.length || s.some((leaf, i) => !scientificTokensMatch(leaf.text, t[i].text)))
    throw Error("editorial-scientific-divergence");
  if (
    s.some(
      (leaf, i) =>
        !protectedEquation(leaf) &&
        leaf.text.trim() === t[i].text.trim() &&
        (leaf.text.match(/\p{L}+/gu)?.length ?? 0) >= 3,
    ) ||
    Object.keys(metadata.source).some(
      (key) =>
        metadata.source[key].trim() === metadata.target[key]?.trim() &&
        (metadata.source[key].match(/\p{L}+/gu)?.length ?? 0) >= 3,
    )
  )
    throw Error("editorial-untranslated-content");
  const meaningRevision = verifyMeaning(source, target, locale, revision, evidence, metadata);
  const report = meaningEvidenceSchema.parse(evidence);
  const findings = editorialDeterministic(source, target, locale);
  for (const f of findings) {
    if (f.severity === "critical") throw Error("editorial-structural-divergence");
    if (
      !report.findings.some(
        (e) =>
          e.id === f.segment &&
          e.sourceQuote === f.source &&
          e.targetQuote === f.target &&
          e.outcome === "equivalent" &&
          e.resolvedSignals.some((code) => code === f.code),
      )
    )
      throw Error("editorial-unresolved-warning");
  }
  if (s.some((leaf, i) => editorialWarnings(leaf.text, t[i].text, locale).length))
    throw Error("editorial-linguistic-review-required");
  for (const f of portugueseLinkWarnings(target)) {
    const url = f.target ?? "";
    const links = [...target.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].filter((m) => m[2] === url);
    if (
      !links.length ||
      links.some((m) => !m[1].includes(locale === "en" ? "(in Portuguese)" : "(en portugués)"))
    )
      throw Error("editorial-unlabelled-portuguese-link");
  }
  return {
    policyId: policyHash(policy),
    meaningRevision,
    checks: [
      "structure",
      "scientific-tokens",
      "grounded-meaning",
      "linguistic-signals",
      "language-links",
    ],
    limitations: ["AI evidence is fallible; no human review or scientific certification claimed."],
    findings,
  };
}
