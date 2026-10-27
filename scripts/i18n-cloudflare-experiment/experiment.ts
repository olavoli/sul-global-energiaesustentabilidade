import { readFile, mkdir, open, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { parseEditorialFile } from "../generate-content";
import {
  prepare,
  assemble,
  deterministic,
  hash,
  type Segment,
  type Locale,
  type Finding,
} from "../i18n-simulation/pipeline";
import { batches } from "../i18n-real-pilot/sample";
import { translationPayload, models, type Transport } from "../i18n-real-pilot/adapters";
import { Budget, cost, inputEstimate, limits, rates, type Ledger } from "../i18n-real-pilot/budget";
import { summarize } from "../i18n-real-pilot/metrics";

export const promptVersion = "cf-protected-leaves-v6";
/** Only standalone symbolic equations are copied from source; prose is never silently restored. */
export function protectedEquation(segment: Pick<Segment, "text">) {
  const text = segment.text.trim();
  return (
    /^[PE]$|^Δ[A-Za-z]+$|^[.,;:!?]+$/.test(text) ||
    (text.includes("=") && /^[\p{L}\p{N}\s.,+*/^()=−×÷_%_-]+$/u.test(text))
  );
}
export const boundaryPolicyVersion = "source-ascii-boundaries-v1";
/** Strip only ASCII structural boundary characters, never Unicode or internal spacing. */
export function splitBoundary(text: string) {
  const prefix = /^[ \t\r\n]*/.exec(text)?.[0] ?? "";
  const remainder = text.slice(prefix.length);
  const suffix = /[ \t\r\n]*$/.exec(remainder)?.[0] ?? "";
  return { prefix, core: remainder.slice(0, remainder.length - suffix.length), suffix };
}
export function restoreBoundary(source: string, target: string) {
  const original = splitBoundary(source),
    returned = splitBoundary(target);
  if (!original.core.trim() || !returned.core.trim()) throw new Error("empty-linguistic-core");
  return {
    text: original.prefix + returned.core + original.suffix,
    diagnostic: {
      prefix: original.prefix,
      suffix: original.suffix,
      returnedPrefix: returned.prefix,
      returnedSuffix: returned.suffix,
      coreUnchanged: true,
    },
  };
}
export function experimentPayload(segments: readonly Segment[], locale: Locale) {
  const payload = translationPayload(
    segments
      .filter((s) => !protectedEquation(s))
      .map((s) => {
        const boundary = splitBoundary(s.text);
        if (!boundary.core.trim()) throw new Error("empty-linguistic-core");
        return { ...s, text: boundary.core };
      }),
    locale,
  );
  payload.messages[0].content += ` Target language: ${locale === "en" ? "English" : "Spanish"}. Translate EVERY supplied natural-language segment, including headings, fragments, captions and metadata. Do not copy Portuguese prose unchanged. Preserve IDs exactly; return no omitted or extra IDs. Equations excluded from this input are copied directly from the source by the caller. Never reconstruct them. Each ID is an independent text leaf: never merge, split, move or duplicate its content into another ID. Return plain text only, without Markdown emphasis, headings, links, HTML or JSX. Input text contains linguistic cores only. Original leading and trailing ASCII whitespace is held by the caller; return only the translated core. Do not change internal spacing or special Unicode characters.`;
  return payload;
}
export function untranslatedFindings(input: Input, translated: Record<string, string>): Finding[] {
  return [...input.source.segments, ...input.metadata]
    .filter(
      (s) =>
        !protectedEquation(s) &&
        translated[s.id] !== undefined &&
        s.text.trim() === translated[s.id].trim() &&
        (s.text.match(/\p{L}+/gu)?.length ?? 0) >= 3,
    )
    .map((s) => ({
      severity: "review",
      code: "unchanged-source-prose",
      segment: s.id,
      source: s.text,
      target: translated[s.id],
    }));
}
export function partialFindings(
  input: Input,
  translated: Record<string, string>,
  locale: Locale,
): Finding[] {
  const partial = assemble(
    input.source,
    Object.fromEntries(input.source.segments.map((s) => [s.id, translated[s.id] ?? s.text])),
  );
  return [
    ...deterministic(input.source.body, partial, locale).filter((f) => !f.segment),
    ...mappedBodyFindings(input, translated, locale),
    ...equationFindings(input, partial, translated),
    ...metaFindings(input, translated, locale),
    ...untranslatedFindings(input, translated),
  ];
}
export const slug = "o-que-e-potencia";
export const responseParserVersion = "cloudflare-json-mode-v2";
export const locales = ["en", "es"] as const;
export const experimentLimits = Object.freeze({ usd: 0.05, calls: 6, attempts: 1 });
export interface CloudflareCredentials {
  token: string;
  account: string;
}
export function cloudflareCredentials(env: NodeJS.ProcessEnv): CloudflareCredentials | null {
  const token = env.I18N_PILOT_CF_API_TOKEN,
    account = env.I18N_PILOT_CF_ACCOUNT_ID;
  if (!token || !account) return null;
  if (!/^[a-f0-9]{32}$/i.test(account) || token.trim() !== token || /[\r\n]/.test(token))
    throw new Error("invalid-cloudflare-credential-format");
  return { token, account };
}
export async function loadInput(root: string) {
  const raw = await readFile(join(root, `content/articles/${slug}.mdx`), "utf8");
  const article = parseEditorialFile(raw);
  if (
    article.frontmatter.slug !== slug ||
    article.frontmatter.status !== "published" ||
    article.frontmatter.isDemo ||
    !article.frontmatter.approvedAt ||
    article.body.includes("<!--")
  )
    throw new Error("source-not-approved-public-article");
  const source = prepare(article.body);
  const metadata = Object.entries(article.frontmatter)
    .filter(
      ([key, value]) =>
        [
          "title",
          "subtitle",
          "excerpt",
          "seoTitle",
          "seoDescription",
          "aiDisclosure",
          "opinionDisclosure",
        ].includes(key) && typeof value === "string",
    )
    .map(([key, text]) => ({ id: `meta:${key}`, text: String(text), start: 0, end: 0 }));
  for (const key of ["alt", "caption"] as const) {
    const text = article.frontmatter.cover[key];
    if (text) metadata.push({ id: `cover:${key}`, text, start: 0, end: 0 });
  }
  return {
    article,
    source,
    metadata,
    sourceRevision: hash(raw),
    chunks: batches([...source.segments, ...metadata]),
  };
}
export type Input = Awaited<ReturnType<typeof loadInput>>;
export function plan(input: Input) {
  const calls = locales.flatMap((locale) =>
    input.chunks.map((chunk, index) => {
      const estimatedInputTokens = inputEstimate(experimentPayload(chunk, locale));
      return {
        locale,
        index,
        estimatedInputTokens,
        maxOutputTokens: limits.outputTranslation,
        reservedUSD: cost("cloudflare", estimatedInputTokens, limits.outputTranslation),
      };
    }),
  );
  const totalUSD = calls.reduce((n, c) => n + c.reservedUSD, 0);
  return {
    calls,
    totalUSD,
    allowed:
      totalUSD <= experimentLimits.usd &&
      calls.length <= experimentLimits.calls &&
      calls.every((c) => c.estimatedInputTokens <= limits.inputPerCall),
  };
}
class CloudflareBudget extends Budget {
  override async reserve(request: Parameters<Budget["reserve"]>[0]) {
    if (
      request.provider !== "cloudflare" ||
      request.stage !== "translation" ||
      request.article !== slug
    )
      throw new Error("experiment-scope-violation");
    const held = this.ledger.calls.reduce(
      (n, c) => n + Math.max(c.reservedUSD, c.usageCalculatedUSD ?? 0),
      0,
    );
    if (
      this.ledger.calls.length >= experimentLimits.calls ||
      held + cost("cloudflare", request.estimatedInputTokens, request.maxOutputTokens) >
        experimentLimits.usd
    )
      throw new Error("experiment-budget-exceeded");
    return super.reserve(request);
  }
}
const responseSchema = z.object({
  success: z.literal(true),
  result: z.object({
    response: z.unknown().optional(),
    finish_reason: z.string().nullable().optional(),
    stop_reason: z.string().nullable().optional(),
    usage: z.object({
      prompt_tokens: z.number().int().nonnegative(),
      completion_tokens: z.number().int().nonnegative(),
      neurons: z.number().nonnegative().optional(),
    }),
  }),
});
const translatedSchema = z
  .object({
    translations: z
      .array(
        z
          .object({ id: z.string(), text: z.string().refine((value) => value.trim().length > 0) })
          .strict(),
      )
      .min(1),
  })
  .strict();
/** Accept only the documented response forms, then apply the SAME strict translation contract. */
export function decodeTranslationResponse(response: unknown, chunk: readonly Segment[]) {
  if (response === undefined || response === null) throw new Error("incomplete-response");
  if (typeof response !== "string" && (typeof response !== "object" || Array.isArray(response)))
    throw new Error("translation-response-type-invalid");
  let parsed;
  try {
    parsed = translatedSchema.parse(typeof response === "string" ? JSON.parse(response) : response);
  } catch {
    throw new Error("translation-json-invalid");
  }
  const ids = parsed.translations.map((segment) => segment.id);
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== chunk.length ||
    chunk.some((segment) => !ids.includes(segment.id))
  )
    throw new Error("translation-incomplete-or-ids-invalid");
  return Object.fromEntries(parsed.translations.map((segment) => [segment.id, segment.text]));
}
/** Structural diagnostics only: no generated text, arbitrary keys, headers or account IDs. */
export function responseDiagnostics(response: unknown) {
  const kind =
    response === undefined
      ? "missing"
      : response === null
        ? "null"
        : Array.isArray(response)
          ? "array"
          : typeof response;
  const object =
    typeof response === "object" && response !== null && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : null;
  return {
    responseKind: kind,
    responseBytes: typeof response === "string" ? Buffer.byteLength(response) : null,
    translationCount:
      object && Array.isArray(object.translations) ? object.translations.length : null,
  };
}
async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("empty-response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("response-size-limit");
    }
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
/** Cloudflare-only boundary: no OpenAI credential, method or endpoint exists here. */
async function translate(
  chunk: Segment[],
  locale: Locale,
  index: number,
  auth: CloudflareCredentials,
  budget: CloudflareBudget,
  transport: Transport,
  boundaryDiagnostics: (ReturnType<typeof restoreBoundary>["diagnostic"] & { id: string })[],
) {
  const payload = experimentPayload(chunk, locale);
  const call = await budget.reserve({
    id: `${slug}:${locale}:${index}`,
    article: slug,
    locale,
    provider: "cloudflare",
    stage: "translation",
    estimatedInputTokens: inputEstimate(payload),
    maxOutputTokens: limits.outputTranslation,
  });
  const started = performance.now();
  try {
    const response = await transport(
      `https://api.cloudflare.com/client/v4/accounts/${auth.account}/ai/run/${models.cloudflare}`,
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(limits.timeoutMs),
        headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) throw new Error(`provider-http-${response.status}`);
    const result = responseSchema.parse(await boundedJson(response)).result;
    Object.assign(call, {
      responseParserVersion,
      responseDiagnostics: responseDiagnostics(result.response),
    });
    await budget.complete(
      call,
      {
        inputTokens: result.usage.prompt_tokens,
        outputTokens: result.usage.completion_tokens,
        neurons: result.usage.neurons ?? null,
        providerReportedCostUSD: null,
      },
      performance.now() - started,
    );
    if (
      result.usage.completion_tokens >= limits.outputTranslation ||
      [result.finish_reason, result.stop_reason].some(
        (r) => r != null && !["stop", "eos_token", "end_turn"].includes(r),
      )
    )
      throw new Error("possibly-truncated-response");
    const natural = chunk.filter((s) => !protectedEquation(s));
    const decoded = decodeTranslationResponse(result.response, natural);
    const restored = natural.map((segment) => ({
      id: segment.id,
      ...restoreBoundary(segment.text, decoded[segment.id]),
    }));
    boundaryDiagnostics.push(...restored.map(({ id, diagnostic }) => ({ id, ...diagnostic })));
    return {
      ...Object.fromEntries(restored.map((s) => [s.id, s.text])),
      ...Object.fromEntries(chunk.filter(protectedEquation).map((s) => [s.id, s.text])),
    };
  } catch (error) {
    const code =
      error instanceof Error &&
      /^(?:provider-http-\d{3}|possibly-truncated-response|incomplete-response|translation-response-type-invalid|translation-json-invalid|translation-incomplete-or-ids-invalid)$/.test(
        error.message,
      )
        ? error.message
        : "provider-or-response-failure";
    await budget.fail(call, code, performance.now() - started);
    throw new Error(code);
  }
}
/** Symbolic formulas and MathExpression contents are not natural-language translation targets. */
function equationFindings(
  input: Input,
  body: string,
  translated: Record<string, string>,
): Finding[] {
  const findings: Finding[] = [];
  const mathBlocks = (text: string) =>
    Array.from(
      text.matchAll(/<MathExpression\b[^>]*>[\s\S]*?<\/MathExpression>/g),
      (match) => match[0],
    );
  if (JSON.stringify(mathBlocks(input.source.body)) !== JSON.stringify(mathBlocks(body)))
    findings.push({ severity: "critical", code: "math-expression-verbatim" });
  for (const segment of input.source.segments)
    if (
      protectedEquation(segment) &&
      translated[segment.id] !== undefined &&
      translated[segment.id] !== segment.text
    )
      findings.push({
        severity: "critical",
        code: "symbolic-equation-verbatim",
        segment: segment.id,
        source: segment.text,
        target: translated[segment.id],
      });
  return findings;
}
/** Numeric/structural leaf checks use ORIGINAL IDs, never re-numbered target AST positions. */
function mappedBodyFindings(
  input: Input,
  translated: Record<string, string>,
  locale: Locale,
): Finding[] {
  return input.source.segments
    .filter((s) => translated[s.id] !== undefined && !protectedEquation(s))
    .flatMap((s) => {
      const target = translated[s.id];
      if (/^\s/.test(s.text) !== /^\s/.test(target) || /\s$/.test(s.text) !== /\s$/.test(target))
        return [
          {
            severity: "critical" as const,
            code: "segment-boundary-whitespace",
            segment: s.id,
            source: s.text,
            target,
          },
        ];
      const findings = deterministic(
        `Leaf\n\n${s.text}\n\n## Referências\n`,
        `Leaf\n\n${target}\n\n## Referências\n`,
        locale,
      );
      return findings.map((f) => ({
        ...f,
        code: ["structure-links-images-credits", "segment-count", "invalid-mdx"].includes(f.code)
          ? "segment-structure-changed"
          : f.code,
        segment: s.id,
        source: s.text,
        target,
      }));
    });
}
function metaFindings(input: Input, translated: Record<string, string>, locale: Locale) {
  return input.metadata
    .filter((m) => translated[m.id] !== undefined)
    .flatMap((m) =>
      deterministic(
        `Metadata\n\n${m.text}\n\n## Referências\n`,
        `Metadata\n\n${translated[m.id]}\n\n## Referências\n`,
        locale,
      ).map((f) => ({ ...f, segment: m.id })),
    );
}
export function validateTranslation(
  input: Input,
  translated: Record<string, string>,
  locale: Locale,
) {
  const body = assemble(
    input.source,
    Object.fromEntries(input.source.segments.map((s) => [s.id, translated[s.id]])),
  );
  const findings = [
    ...deterministic(input.source.body, body, locale).filter((f) => !f.segment),
    ...mappedBodyFindings(input, translated, locale),
    ...equationFindings(input, body, translated),
    ...metaFindings(input, translated, locale),
    ...untranslatedFindings(input, translated),
  ];
  if (input.metadata.some((m) => !translated[m.id])) throw new Error("metadata-incomplete");
  if (findings.some((f) => f.severity === "critical")) return { body, findings, mdx: null };
  const frontmatter = {
    ...input.article.frontmatter,
    cover: { ...input.article.frontmatter.cover },
  };
  for (const m of input.metadata) {
    const [kind, key] = m.id.split(":");
    if (kind === "cover") Object.assign(frontmatter.cover, { [key]: translated[m.id] });
    else Object.assign(frontmatter, { [key]: translated[m.id] });
  }
  for (const key of [
    "publishedAt",
    "approvedAt",
    "reviewedAt",
    "updatedAt",
    "scheduledAt",
  ] as const)
    delete frontmatter[key];
  const targetSlug = `experiment-${locale}-${slug}`;
  const artifact = {
    ...frontmatter,
    slug: targetSlug,
    status: "draft",
    draftStage: "writing",
    isDemo: true,
    featured: false,
    locale,
    translationOf: slug,
    sourceRevision: input.sourceRevision,
    translationReview: { status: "pending" },
    canonicalUrl: `/${locale}/${locale === "en" ? "article" : "articulo"}/${targetSlug}`,
    experimentOnly: true,
    experimentDecision: "REVIEW_REQUIRED",
    publishable: false,
    experimentNotice: "EXPERIMENT ONLY: NOT PUBLISHABLE. NO INDEPENDENT SCIENTIFIC REVIEW.",
  };
  // Localize only the bibliography label; every bibliographic entry remains verbatim.
  const localizedBody = body.replace(
    /^## Referências[ \t]*$/m,
    locale === "en" ? "## References" : "## Referencias",
  );
  if (prepare(localizedBody).bibliography !== input.source.bibliography)
    throw new Error("bibliography-divergence");
  const mdx = `---\n${JSON.stringify(artifact, null, 2)}\n---\n${localizedBody}`;
  const parsed = parseEditorialFile(mdx, "non-publishable-experiment.mdx");
  prepare(parsed.body);
  if (parsed.frontmatter.status !== "draft" || !parsed.frontmatter.isDemo)
    throw new Error("artifact-state-invalid");
  return { body, findings, mdx };
}
export interface Options {
  execute: boolean;
  authorized: boolean;
  auth: CloudflareCredentials | null;
  transport?: Transport;
}
export async function runExperiment(input: Input, directory: string, options: Options) {
  if (input.article.frontmatter.slug !== slug) throw new Error("experiment-scope-violation");
  await mkdir(directory, { recursive: true });
  const estimate = plan(input);
  const report = {
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    article: slug,
    sourceRevision: input.sourceRevision,
    bodySegments: input.source.segments.length,
    metadataFields: input.metadata.map((m) => m.id),
    protectedSegmentIDs: input.source.segments.filter(protectedEquation).map((s) => s.id),
    submittedIDs: input.chunks.map((chunk) =>
      chunk.filter((s) => !protectedEquation(s)).map((s) => s.id),
    ),
    model: models.cloudflare,
    pricingConsulted: "2026-10-25",
    promptVersion,
    boundaryPolicyVersion,
    sourceBoundaries: [...input.source.segments, ...input.metadata]
      .filter((s) => !protectedEquation(s))
      .map((s) => ({
        id: s.id,
        prefix: splitBoundary(s.text).prefix,
        suffix: splitBoundary(s.text).suffix,
      })),
    responseParserVersion,
    measurementOrigin: !options.execute
      ? "not-executed"
      : options.transport
        ? "injected-test-transport"
        : "provider-api",
    mode: options.execute ? "execution-requested" : "offline-plan",
    state: "PLANNED",
    publishable: false,
    automaticPublication: false,
    independentReviewPerformed: false,
    estimate,
    financialLimitUSD: experimentLimits.usd,
    pricing: rates.cloudflare,
    billingReconciled: false,
    results: locales.map((locale) => ({
      locale,
      decision: "REVIEW_REQUIRED" as "REVIEW_REQUIRED" | "BLOCK",
      findings: [] as Finding[],
      boundaryDiagnostics: [] as (ReturnType<typeof restoreBoundary>["diagnostic"] & {
        id: string;
      })[],
      artifact: null as string | null,
      consumption: null as unknown,
      reason: "experiment-not-executed",
    })),
  };
  const reportFile = join(
    directory,
    options.execute ? `execution-${report.runId}.json` : "plan-report.json",
  );
  const save = () => writeFile(reportFile, JSON.stringify(report, null, 2), { mode: 0o600 });
  if (!estimate.allowed) report.state = "BLOCK_BUDGET";
  await save();
  if (!options.execute) return report;
  if (!options.authorized || !options.auth) {
    report.state = "REVIEW_REQUIRED_AUTHORIZATION_OR_CREDENTIALS";
    await save();
    return report;
  }
  if (!estimate.allowed) {
    report.state = "BLOCK_BUDGET";
    report.results.forEach((r) => {
      r.decision = "BLOCK";
      r.reason = "plan-exceeds-experiment-limits";
    });
    await save();
    return report;
  }
  let lock;
  try {
    lock = await open(join(directory, "campaign.lock"), "wx", 0o600);
  } catch {
    report.state = "BLOCK_CONCURRENT_EXECUTION";
    await save();
    return report;
  }
  const ledger: Ledger = { version: "real-pilot-v1", calls: [] };
  try {
    // Exclusive creation prevents retries after any previous attempt, including a process crash.
    const sentinel = await open(join(directory, "ledger.json"), "wx", 0o600);
    try {
      await sentinel.writeFile(JSON.stringify(ledger));
    } finally {
      await sentinel.close();
    }
    const budget = new CloudflareBudget(ledger, async (value) => {
      await writeFile(join(directory, "ledger.tmp"), JSON.stringify(value, null, 2), {
        mode: 0o600,
      });
      await rename(join(directory, "ledger.tmp"), join(directory, "ledger.json"));
    });
    for (const row of report.results) {
      const translated: Record<string, string> = {};
      for (let i = 0; i < input.chunks.length; i++) {
        Object.assign(
          translated,
          await translate(
            input.chunks[i],
            row.locale,
            i,
            options.auth,
            budget,
            options.transport ?? fetch,
            row.boundaryDiagnostics,
          ),
        );
        const early = partialFindings(input, translated, row.locale);
        if (early.some((f) => f.severity === "critical")) {
          row.findings = early;
          row.decision = "BLOCK";
          row.reason = "deterministic-divergence";
          throw new Error("deterministic-divergence");
        }
      }
      const validated = validateTranslation(input, translated, row.locale);
      row.findings = validated.findings;
      if (!validated.mdx) {
        row.decision = "BLOCK";
        row.reason = "deterministic-divergence";
        throw new Error("deterministic-divergence");
      }
      // This is the only MDX write, after both deterministic and schema validation.
      const artifactName = `NONPUBLISHABLE-${row.locale}.mdx`;
      await writeFile(join(directory, artifactName), validated.mdx, { flag: "wx", mode: 0o600 });
      row.artifact = artifactName;
      row.reason = "independent-review-not-performed";
      row.consumption = summarize(ledger.calls.filter((c) => c.locale === row.locale)).translation;
      await save();
    }
    report.state = "TRANSLATED_AWAITING_REVIEW";
  } catch (error) {
    const code =
      error instanceof Error && /^[a-z0-9-]+$/.test(error.message)
        ? error.message
        : "campaign-failure-reconcile-before-retry";
    report.state = "BLOCKED_RECONCILE_BEFORE_RETRY";
    for (const row of report.results)
      if (row.reason === "experiment-not-executed") {
        row.decision = "BLOCK";
        row.reason = code;
      }
  } finally {
    // Even a failed/partial call retains the observed usage and its full reservation.
    for (const row of report.results) {
      const calls = ledger.calls.filter((c) => c.locale === row.locale);
      if (calls.length) row.consumption = { ...summarize(calls).translation, calls };
    }
    await save();
    await lock.close();
    await unlink(join(directory, "campaign.lock"));
  }
  return report;
}
