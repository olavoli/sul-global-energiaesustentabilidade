import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { z } from "zod";
import { parseEditorialFile } from "../generate-content";
import {
  prepare,
  assemble,
  deterministic,
  hash,
  type Segment,
  type Locale,
} from "../i18n-simulation/pipeline";
import { batches } from "../i18n-real-pilot/sample";
import { models, type Transport } from "../i18n-real-pilot/adapters";
// Pure, side-effect-free helpers only. No experimental controller or ledger is instantiated.
import {
  experimentPayload,
  decodeTranslationResponse,
  restoreBoundary,
  protectedEquation,
} from "../i18n-cloudflare-experiment/experiment";
import { translationSchema, translatedArticlePath } from "../../src/content/translation-schema";
import { remarkEditorialSlots } from "../../src/content/remark-editorial-slots";
import { policy } from "./policy";
import {
  proseNumbers,
  editorialWarnings,
  editorialDeterministic,
  localizedLabels,
  localizedCredit,
  portugueseLinkWarnings,
  translationDisclosure,
} from "./editorial";
import { guard, providerError } from "./errors";
export async function input(root: string, slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("invalid-slug");
  const raw = await readFile(join(root, "content/articles", slug + ".mdx"), "utf8");
  const article = parseEditorialFile(raw);
  if (
    article.frontmatter.status !== "published" ||
    article.frontmatter.isDemo ||
    article.frontmatter.slug !== slug
  )
    throw new Error("source-not-public");
  const source = prepare(article.body),
    metadata: Segment[] = [];
  for (const key of [
    "title",
    "subtitle",
    "excerpt",
    "seoTitle",
    "seoDescription",
    "aiDisclosure",
    "opinionDisclosure",
  ] as const) {
    const text = article.frontmatter[key];
    if (typeof text === "string") metadata.push({ id: `meta:${key}`, text, start: 0, end: 0 });
  }
  for (const key of ["alt", "caption"] as const) {
    const text = article.frontmatter.cover[key];
    if (text) metadata.push({ id: `cover:${key}`, text, start: 0, end: 0 });
  }
  const math = [...article.body.matchAll(/<MathExpression\b[^>]*>[\s\S]*?<\/MathExpression>/g)].map(
    (m) => ({ start: m.index, end: m.index + m[0].length }),
  );
  const protectedSegments = source.segments.filter(
    (s) => protectedEquation(s) || math.some((m) => s.start >= m.start && s.end <= m.end),
  );
  const protectedIDs = new Set(protectedSegments.map((s) => s.id));
  const chunks = batches([...source.segments.filter((s) => !protectedIDs.has(s.id)), ...metadata]);
  return { article, source, metadata, protectedSegments, chunks, sourceRevision: hash(raw) };
}
export type Input = Awaited<ReturnType<typeof input>>;
export const payload = (chunk: Segment[], locale: Locale) => experimentPayload(chunk, locale);
export async function request(
  chunk: Segment[],
  locale: Locale,
  credentials: { account: string; token: string },
  transport: Transport = fetch,
  freeOnly = false,
  assessmentPayload?: ReturnType<typeof payload>,
) {
  const body = JSON.stringify(assessmentPayload ?? payload(chunk, locale));
  const response = await guard("request", "attempted-unconfirmed", () =>
    transport(
      `https://api.cloudflare.com/client/v4/accounts/${credentials.account}/ai/run/${models.cloudflare}`,
      {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(90000),
      },
    ),
  );
  if (!response.ok && freeOnly) {
    let providerCode: number | undefined;
    try {
      const text = await response.text();
      if (text.length <= 65536) {
        const parsed = z
          .object({ errors: z.array(z.object({ code: z.number().int() })) })
          .safeParse(JSON.parse(text));
        if (parsed.success) providerCode = parsed.data.errors[0]?.code;
      }
    } catch {
      /* Never expose error bodies. */
    }
    if (response.status === 429)
      throw providerError(
        providerCode === 3036 ? "free-quota-exhausted" : "free-provider-rate-limited",
        "response-received",
        429,
        providerCode,
      );
    if (providerCode === 5035)
      throw providerError(
        "free-model-requires-paid",
        "response-received",
        response.status,
        providerCode,
      );
  }
  if (!response.ok)
    throw providerError(
      response.status === 401 || response.status === 403
        ? "provider-auth-rejected"
        : "provider-http-error",
      "response-received",
      response.status,
    );
  const reader = response.body?.getReader();
  if (!reader) throw providerError("provider-empty-response", "response-received");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const part = await guard("request", "response-received", () => reader.read());
      if (part.done) break;
      size += part.value.length;
      if (size > 2 * 1024 * 1024)
        throw providerError("provider-response-size-limit", "response-received");
      chunks.push(part.value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* Never replace the original read failure. */
    }
  }
  let json: unknown;
  try {
    json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw providerError("provider-json-invalid", "response-received");
  }
  if (json && typeof json === "object" && "success" in json && json.success === false)
    throw providerError("provider-rejected", "response-received");
  const parsed = z
    .object({
      success: z.literal(true),
      result: z.object({
        response: z.unknown(),
        usage: z.object({
          prompt_tokens: z.number().int().nonnegative(),
          completion_tokens: z.number().int().nonnegative(),
          neurons: z.number().nonnegative().optional(),
        }),
        finish_reason: z.string().nullable().optional(),
        stop_reason: z.string().nullable().optional(),
      }),
    })
    .safeParse(json);
  if (!parsed.success) throw providerError("provider-envelope-invalid", "response-received");
  return parsed.data.result;
}
export function decode(result: Awaited<ReturnType<typeof request>>, chunk: Segment[]) {
  if (
    result.usage.completion_tokens >= policy.maxOutput ||
    [result.finish_reason, result.stop_reason].some(
      (r) => r && !["stop", "end_turn", "eos_token"].includes(r),
    )
  )
    throw new Error("incomplete-response");
  return decodeTranslationResponse(result.response, chunk);
}
export async function draft(source: Input, locale: Locale, translations: Record<string, string>) {
  const expected = [
    ...source.source.segments.filter((s) => !source.protectedSegments.some((p) => p.id === s.id)),
    ...source.metadata,
  ];
  if (
    Object.keys(translations).length !== expected.length ||
    expected.some((s) => typeof translations[s.id] !== "string")
  )
    throw new Error("incomplete-translation");
  const mapped: Record<string, string> = {},
    boundaries = [];
  const reviewFindings = [];
  for (const s of expected) {
    const restored = restoreBoundary(s.text, translations[s.id]);
    const numeric = proseNumbers(s.text, restored.text, locale);
    mapped[s.id] = numeric.text;
    reviewFindings.push(...editorialWarnings(s.text, mapped[s.id], locale, s.id));
    if (numeric.changes.length)
      reviewFindings.push({
        severity: "review" as const,
        code: "numeric-locale-adjusted",
        segment: s.id,
      });
    boundaries.push({ id: s.id, ...restored.diagnostic });
    if (s.text.trim() === mapped[s.id].trim() && (s.text.match(/\p{L}+/gu)?.length ?? 0) >= 3)
      throw new Error("untranslated-segment");
    const findings = deterministic(
      `Leaf\n\n${s.text}\n\n## Referências\n`,
      `Leaf\n\n${mapped[s.id]}\n\n## Referências\n`,
      locale,
    );
    reviewFindings.push(...findings.map((f) => ({ ...f, segment: s.id })));
    if (findings.some((f) => f.severity === "critical"))
      throw new Error(`deterministic-divergence:${s.id}`);
  }
  for (const s of source.protectedSegments) mapped[s.id] = s.text;
  const assembledBody = assemble(
    source.source,
    Object.fromEntries(source.source.segments.map((s) => [s.id, mapped[s.id]])),
  );
  const body = localizedLabels(assembledBody, locale);
  const structural = editorialDeterministic(source.source.body, body, locale).filter(
    (f) => !f.segment,
  );
  reviewFindings.push(...portugueseLinkWarnings(body));
  for (const s of source.protectedSegments)
    reviewFindings.push(...editorialWarnings(s.text, s.text, locale, s.id));
  if (structural.some((f) => f.severity === "critical")) throw new Error("structural-divergence");
  const fm: Record<string, unknown> = structuredClone(source.article.frontmatter);
  fm.cover = {
    ...source.article.frontmatter.cover,
    credit: localizedCredit(source.article.frontmatter.cover.credit, locale),
  };
  for (const s of source.metadata) {
    const [group, key] = s.id.split(":");
    if (group === "meta") fm[key] = mapped[s.id];
    else (fm.cover as Record<string, unknown>)[key] = mapped[s.id];
  }
  for (const key of ["approvedAt", "publishedAt", "scheduledAt", "reviewedAt", "updatedAt"])
    delete fm[key];
  Object.assign(fm, {
    aiAssistance: "substantial",
    aiDisclosure: [fm.aiDisclosure, translationDisclosure(locale)].filter(Boolean).join(" "),
    status: "draft",
    draftStage: "writing",
    locale,
    translationOf: source.article.frontmatter.slug,
    sourceRevision: source.sourceRevision,
    translationReview: { status: "pending" },
    canonicalUrl: translatedArticlePath(locale, source.article.frontmatter.slug),
  });
  translationSchema.parse(fm);
  const mdx = `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${body}`;
  parseEditorialFile(mdx);
  await compile(mdx, { remarkPlugins: [remarkFrontmatter, remarkEditorialSlots] });
  return {
    mdx,
    boundaries,
    status: "REVIEW_REQUIRED",
    publishable: false,
    findings: [...structural, ...reviewFindings],
  };
}
