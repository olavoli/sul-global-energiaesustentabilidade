/** Offline-only prototype. No network adapter or editorial transition capability. */
import { createHash } from "node:crypto";
import { createProcessor } from "@mdx-js/mdx";
import { z } from "zod";
import { parseEditorialFile, validateSafeMdx } from "../generate-content";

export type Locale = "en" | "es";
export type Outcome = "PASS" | "REVIEW_REQUIRED" | "BLOCK";
export const policy = {
  version: "simulation-v1",
  enabled: false,
  simulationOnly: true,
  authorizedBy: null,
  categories: ["ciencia"],
  contentTypes: ["explainer"],
  exclusions: ["ART-033", "documentary-caveat", "unverified-evidence", "mineral-statistics"],
} as const;
export const hash = (value: string) =>
  createHash("sha256").update(value.replace(/\r\n/g, "\n")).digest("hex");

interface AstNode {
  type: string;
  value?: string;
  name?: string;
  url?: string;
  attributes?: AstNode[];
  children?: AstNode[];
  position?: { start: { offset: number }; end: { offset: number } };
}
export interface Segment {
  id: string;
  text: string;
  start: number;
  end: number;
}
export interface Prepared {
  body: string;
  segments: Segment[];
  skeleton: string;
  bibliography: string;
}
/** The provider receives text leaves only; components, URLs, credits and references stay locked. */
export function prepare(body: string): Prepared {
  validateSafeMdx(body, "simulation");
  const bibliographyStart = body.search(
    /^##\s+(?:Referências(?: [Bb]ibliográficas)?|References|Referencias)\s*$/m,
  );
  if (bibliographyStart < 0) throw new Error("Bibliography heading required");
  const tree = createProcessor().parse(body) as unknown as AstNode;
  const segments: Segment[] = [];
  function visit(node: AstNode) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined && start < bibliographyStart) {
      if (node.type === "text" && node.value?.trim()) {
        // Raw source offsets preserve escapes; citations remain protected by validation.
        segments.push({ id: `s${segments.length}`, text: body.slice(start, end), start, end });
      }
      if (
        node.type === "mdxJsxAttribute" &&
        ["alt", "caption", "title"].includes(node.name ?? "")
      ) {
        const raw = body.slice(start, end);
        const match = raw.match(/^[\w]+\s*=\s*(["'])([\s\S]*)\1$/);
        if (!match) throw new Error("Unsupported translatable attribute");
        const valueStart = start + raw.indexOf(match[1]) + 1;
        segments.push({
          id: `s${segments.length}`,
          text: match[2],
          start: valueStart,
          end: end - 1,
        });
      }
    }
    node.attributes?.forEach(visit);
    node.children?.forEach(visit);
  }
  visit(tree);
  segments.sort((a, b) => a.start - b.start);
  segments.forEach((s, i) => {
    s.id = `s${i}`;
  });
  let skeleton = body;
  for (const s of [...segments].reverse())
    skeleton = skeleton.slice(0, s.start) + "TEXT" + skeleton.slice(s.end);
  return {
    body,
    segments,
    skeleton,
    bibliography: body.slice(bibliographyStart).replace(/^##[^\n]*/, "## REFERENCES"),
  };
}
export function assemble(source: Prepared, translated: Record<string, string>): string {
  if (Object.keys(translated).length !== source.segments.length)
    throw new Error("Incomplete segments");
  let body = source.body;
  for (const s of [...source.segments].reverse()) {
    if (typeof translated[s.id] !== "string" || !translated[s.id].trim())
      throw new Error("Missing segment");
    body = body.slice(0, s.start) + translated[s.id] + body.slice(s.end);
  }
  prepare(body); // Reject executable MDX and malformed AST before returning anything.
  return body;
}

export interface TranslationProvider {
  id: string;
  modelVersion: string;
  translate(segments: readonly Segment[], locale: Locale): Promise<Record<string, string>>;
}
export const dimensions = [
  "causality",
  "certainty",
  "conditions",
  "conclusions",
  "mineral-terms",
  "estimates",
  "statistics",
] as const;
export type Dimension = (typeof dimensions)[number];
const evidenceSchema = z.object({
  dimension: z.enum(dimensions),
  sourceQuote: z.string().min(1),
  targetQuote: z.string().min(1),
  result: z.enum(["equivalent", "uncertain", "contradiction"]),
  explanation: z.string().min(3),
});
const semanticSchema = z.object({
  sourceHash: z.string(),
  targetHash: z.string(),
  provider: z.string().min(1),
  modelVersion: z.string().min(1),
  origin: z.enum(["fixture", "model"]),
  checks: z.array(evidenceSchema).min(7),
});
export type SemanticReport = z.infer<typeof semanticSchema>;
export interface SemanticVerifier {
  verify(source: Prepared, target: Prepared): Promise<unknown>;
}

const sorted = (values: string[]) => JSON.stringify(values.sort());
function numbers(text: string): string[] {
  return Array.from(text.matchAll(/\d+(?:[.,]\d+)?/g), (m) => m[0].replace(",", "."));
}
function citations(text: string): string[] {
  return Array.from(text.matchAll(/\[\d+\]/g), (m) => m[0]);
}
const unitGroups = [
  /\b(?:Mt|milhões de toneladas|million tonnes|millones de toneladas)\b/gi,
  /\b(?:toneladas|tonnes|tons)\b/gi,
  /\b(?:kWh|MWh|MW|kW|km|kg|REO|NdFeB|Ni-MH)\b/g,
  /°\s*C/g,
];
function units(text: string): string[] {
  return unitGroups.flatMap((pattern, i) =>
    Array.from(text.matchAll(pattern), (m) => (i === 2 ? m[0] : `u${i}`)),
  );
}
function quantities(text: string): string[] {
  return Array.from(
    text.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|Mt|kWh|MWh|MW|kW|km|kg|°\s*C)/g),
    (m) => m[1].replace(",", ".") + m[2].replace(/\s/g, ""),
  );
}
function dates(text: string): string[] {
  return Array.from(text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g), (m) => m[0]);
}
function formula(text: string): string[] {
  return Array.from(text.matchAll(/[%=+−×÷<>]/g), (m) => m[0]);
}
function guardSignals(text: string, locale: "pt-BR" | Locale): string[] {
  const patterns = {
    "pt-BR": [
      /\bnão\b/gi,
      /\bestimativ\w*\b/gi,
      /\bpode(?:m)?\b/gi,
      /\b(?:ressalva|não confirmado)\b/gi,
      /\breservas?\b/gi,
      /\brecursos?\b/gi,
      /\bprodução\b/gi,
      /\bregistros? administrativos?\b/gi,
    ],
    en: [
      /\b(?:not|no|never)\b/gi,
      /\bestimat\w*\b/gi,
      /\b(?:may|might|can)\b/gi,
      /\b(?:caveat|unconfirmed)\b/gi,
      /\breserves?\b/gi,
      /\bresources?\b/gi,
      /\bproduction\b/gi,
      /\badministrative records?\b/gi,
    ],
    es: [
      /\bno\b/gi,
      /\bestimaci\w*\b/gi,
      /\bpuede(?:n)?\b/gi,
      /\b(?:salvedad|no confirmado)\b/gi,
      /\breservas?\b/gi,
      /\brecursos?\b/gi,
      /\bproducción\b/gi,
      /\bregistros? administrativos?\b/gi,
    ],
  };
  return patterns[locale].map((p) => String(Array.from(text.matchAll(p)).length));
}
export interface Finding {
  severity: "critical" | "review";
  code: string;
  segment?: string;
  source?: string;
  target?: string;
}
export function deterministic(sourceBody: string, targetBody: string, locale: Locale): Finding[] {
  const findings: Finding[] = [];
  let source: Prepared, target: Prepared;
  try {
    source = prepare(sourceBody);
    target = prepare(targetBody);
  } catch {
    return [{ severity: "critical", code: "invalid-mdx" }];
  }
  if (source.skeleton !== target.skeleton)
    findings.push({ severity: "critical", code: "structure-links-images-credits" });
  if (source.bibliography !== target.bibliography)
    findings.push({ severity: "critical", code: "bibliography" });
  if (source.segments.length !== target.segments.length)
    findings.push({ severity: "critical", code: "segment-count" });
  source.segments.forEach((s, i) => {
    const t = target.segments[i];
    if (!t) return;
    for (const [code, extract] of [
      ["numbers-dates", numbers],
      ["quantity-unit-pairs", quantities],
      ["iso-dates", dates],
      ["citations", citations],
      ["units", units],
      ["percent-formula", formula],
    ] as const) {
      if (sorted(extract(s.text)) !== sorted(extract(t.text)))
        findings.push({
          severity: "critical",
          code,
          segment: s.id,
          source: s.text,
          target: t.text,
        });
    }
    if (
      JSON.stringify(guardSignals(s.text, "pt-BR")) !== JSON.stringify(guardSignals(t.text, locale))
    ) {
      findings.push({
        severity: "review",
        code: "negation-modality-mineral-caveat",
        segment: s.id,
        source: s.text,
        target: t.text,
      });
    }
  });
  return findings;
}
export interface Context {
  articleId: string;
  synthetic: boolean;
  category: string;
  contentType: string;
  documentaryCaveat: boolean;
  pendingEvidence: boolean;
}
export interface Decision {
  outcome: Outcome;
  reasons: string[];
  findings: Finding[];
  wouldPublish: false;
  semantic: SemanticReport | null;
}
/** Sticky decisions are keyed by content, not model/prompt: retries cannot clear a review. */
export function decide(
  source: Prepared,
  target: Prepared,
  locale: Locale,
  context: Context,
  provider: Pick<TranslationProvider, "id" | "modelVersion">,
  rawSemantic: unknown,
  previous?: Outcome,
): Decision {
  const findings = deterministic(source.body, target.body, locale);
  const reasons = findings.map((f) => f.code);
  let critical = findings.some((f) => f.severity === "critical");
  let review = findings.some((f) => f.severity === "review");
  let semantic: SemanticReport | null = null;
  const parsed = semanticSchema.safeParse(rawSemantic);
  if (!parsed.success) {
    review = true;
    reasons.push("semantic-unavailable-or-invalid");
  } else {
    semantic = parsed.data;
    if (
      semantic.sourceHash !== hash(source.body) ||
      semantic.targetHash !== hash(target.body) ||
      semantic.provider === provider.id ||
      semantic.modelVersion === provider.modelVersion ||
      (semantic.origin === "fixture" && !context.synthetic) ||
      dimensions.some((d) => !semantic?.checks.some((c) => c.dimension === d))
    ) {
      review = true;
      reasons.push("semantic-provenance-or-coverage");
    }
    for (const c of semantic.checks) {
      if (!source.body.includes(c.sourceQuote) || !target.body.includes(c.targetQuote)) {
        review = true;
        reasons.push("semantic-evidence-invalid");
      }
      if (c.result === "contradiction") {
        critical = true;
        reasons.push(`semantic-${c.dimension}`);
      }
      if (c.result === "uncertain") {
        review = true;
        reasons.push(`semantic-${c.dimension}`);
      }
    }
  }
  if (
    !context.synthetic ||
    context.articleId === "ART-033" ||
    context.documentaryCaveat ||
    context.pendingEvidence ||
    !policy.categories.some((c) => c === context.category) ||
    !policy.contentTypes.some((c) => c === context.contentType)
  ) {
    review = true;
    reasons.push("risk-or-scope-exclusion");
  }
  if (previous === "BLOCK") {
    critical = true;
    reasons.push("sticky-block");
  }
  if (previous === "REVIEW_REQUIRED") {
    review = true;
    reasons.push("sticky-review");
  }
  return {
    outcome: critical ? "BLOCK" : review ? "REVIEW_REQUIRED" : "PASS",
    reasons: [...new Set(reasons)],
    findings,
    wouldPublish: false,
    semantic,
  };
}
export function cacheKey(
  source: string,
  locale: Locale,
  provider: TranslationProvider,
  promptVersion: string,
): string {
  return hash(
    JSON.stringify([hash(source), locale, provider.id, provider.modelVersion, promptVersion]),
  );
}
/** Only the isolated harness uses this constructor; real editorial files are never written. */
export function syntheticMdx(body: string, locale: Locale, sourceRevision: string): string {
  const frontmatter = {
    slug: `simulation-${locale}`,
    title: "Synthetic translation fixture",
    subtitle: "Not editorial content",
    excerpt: "Offline fixture; not publishable",
    contentType: "explainer",
    status: "draft",
    draftStage: "writing",
    author: "simulation-fixture",
    category: "ciencia",
    tags: ["simulação"],
    readingTime: 1,
    cover: {
      src: "/fixture-only.svg",
      alt: "Synthetic illustration",
      credit: "Fixture, not a real asset",
    },
    featured: false,
    isDemo: true,
    sponsored: false,
    sources: [],
    referencesInBody: true,
    locale,
    translationOf: "simulation-pt",
    sourceRevision,
    translationReview: { status: "pending" },
    canonicalUrl: `/${locale}/${locale === "en" ? "article" : "articulo"}/simulation-${locale}`,
  };
  const output = `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${body}`;
  parseEditorialFile(output, "isolated-fixture.mdx");
  return output;
}

/** Provider outages and exceptions become review, never a fabricated semantic PASS. */
export async function verifyAndDecide(
  source: Prepared,
  target: Prepared,
  locale: Locale,
  context: Context,
  provider: Pick<TranslationProvider, "id" | "modelVersion">,
  verifier: SemanticVerifier | null,
  previous?: Outcome,
): Promise<Decision> {
  let report: unknown = null;
  try {
    report = verifier ? await verifier.verify(source, target) : null;
  } catch {
    /* Fail closed; provider diagnostics must be sanitized by the adapter. */
  }
  return decide(source, target, locale, context, provider, report, previous);
}
