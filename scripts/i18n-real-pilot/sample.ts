import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEditorialFile } from "../generate-content";
import { prepare, hash, type Segment, type Locale } from "../i18n-simulation/pipeline";
import { inputEstimate, cost, limits } from "./budget";
import { reviewPayload, translationPayload } from "./adapters";
export const sample = [
  { slug: "o-que-e-potencia", complexity: "short: power/energy, units and formulas" },
  {
    slug: "perovskita-silicio-por-que-empilhar-duas-celulas-solares",
    complexity: "medium: tandem photovoltaics and laboratory efficiency",
  },
  {
    slug: "o-que-acontece-com-um-painel-solar-no-fim-da-vida",
    complexity: "long: lifecycle, recycling, quantities and uncertainty",
  },
] as const;
export function batches(segments: readonly Segment[]): Segment[][] {
  const result: Segment[][] = [];
  let batch: Segment[] = [];
  for (const segment of segments) {
    const bytes = (s: Segment[]) =>
      Buffer.byteLength(JSON.stringify(s.map(({ id, text }) => ({ id, text }))));
    if (bytes([segment]) > 3500) throw new Error("segment-too-long-review-required");
    if (batch.length && bytes([...batch, segment]) > 3500) {
      result.push(batch);
      batch = [];
    }
    batch.push(segment);
  }
  if (batch.length) result.push(batch);
  return result;
}
export async function loadSample(root: string) {
  return Promise.all(
    sample.map(async (entry) => {
      const raw = await readFile(join(root, `content/articles/${entry.slug}.mdx`), "utf8");
      const article = parseEditorialFile(raw);
      if (
        article.frontmatter.status !== "published" ||
        article.frontmatter.isDemo ||
        !article.frontmatter.approvedAt ||
        !article.frontmatter.publishedAt ||
        article.body.includes("<!--")
      )
        throw new Error("sample-not-approved-public-content");
      const source = prepare(article.body);
      const metadata = Object.entries(article.frontmatter)
        .filter(
          ([k, v]) =>
            [
              "title",
              "subtitle",
              "excerpt",
              "seoTitle",
              "seoDescription",
              "aiDisclosure",
              "opinionDisclosure",
            ].includes(k) && typeof v === "string",
        )
        .map(([key, text]) => ({ id: `meta:${key}`, text: String(text), start: 0, end: 0 }));
      for (const key of ["alt", "caption"] as const) {
        const text = article.frontmatter.cover[key];
        if (text) metadata.push({ id: `cover:${key}`, text, start: 0, end: 0 });
      }
      return {
        ...entry,
        article,
        source,
        metadata,
        sourceRevision: hash(raw),
        bodyBytes: Buffer.byteLength(article.body),
        chunks: batches([...source.segments, ...metadata]),
        publicUrl: `https://sulglobalenergia.com.br/artigo/${entry.slug}`,
      };
    }),
  );
}
export function estimateArticle(chunks: Segment[][], locale: Locale) {
  const calls = chunks.flatMap((chunk) => {
    const translationInput = inputEstimate(translationPayload(chunk, locale));
    // Planning allowance only: actual review payload is re-estimated immediately before sending.
    const reviewInput =
      inputEstimate(
        reviewPayload(
          chunk.map((s) => ({ id: s.id, source: s.text, target: "" })),
          locale,
        ),
      ) +
      limits.outputTranslation * 4;
    if (Math.max(translationInput, reviewInput) > limits.inputPerCall)
      throw new Error("planned-call-token-limit");
    return [
      {
        provider: "cloudflare" as const,
        input: translationInput,
        output: limits.outputTranslation,
        costUSD: cost("cloudflare", translationInput, limits.outputTranslation),
      },
      {
        provider: "openai" as const,
        input: reviewInput,
        output: limits.outputReview,
        costUSD: cost("openai", reviewInput, limits.outputReview),
      },
    ];
  });
  return {
    locale,
    calls: calls.length,
    inputTokenCeiling: calls.reduce((a, c) => a + c.input, 0),
    outputTokenCeiling: calls.reduce((a, c) => a + c.output, 0),
    translationUSD: calls
      .filter((c) => c.provider === "cloudflare")
      .reduce((a, c) => a + c.costUSD, 0),
    reviewUSD: calls.filter((c) => c.provider === "openai").reduce((a, c) => a + c.costUSD, 0),
  };
}
