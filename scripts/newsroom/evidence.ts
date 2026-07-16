import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import type { NewsSource } from "./schema";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const evidenceSchema = z.object({
  sourceId: slug,
  discoveryMethod: z.enum(["official-page", "official-metadata", "official-documentation"]),
  officialPage: z.url(),
  officialFeedPage: z.url(),
  feedUrl: z.url().optional(),
  feedOwnershipConfirmed: z.boolean(),
  termsUrl: z.url().optional(),
  copyrightUrl: z.url().optional(),
  termsSummary: z.string().min(1),
  copyrightSummary: z.string().min(1),
  collectionLimitations: z.array(z.string().min(1)),
  reviewedAt: z.iso.datetime(),
  reviewedBy: z.string().min(1),
  decision: z.enum(["candidate", "confirmed", "rejected", "needs-review"]),
  decisionReason: z.string().min(1),
});

export type SourceEvidence = z.infer<typeof evidenceSchema>;

export async function loadEvidence(
  id: string,
  root = resolve("newsroom/sources/evidence"),
): Promise<SourceEvidence> {
  const input: unknown = JSON.parse(await readFile(resolve(root, `${id}.json`), "utf8"));
  return evidenceSchema.parse(input);
}

function normalizedHost(input: string): string {
  return new URL(input).hostname.toLowerCase().replace(/^www\./, "");
}

export function assertActivationEvidence(source: NewsSource, evidence: SourceEvidence): void {
  if (evidence.sourceId !== source.id || source.evidenceId !== evidence.sourceId) {
    throw new Error("Dossiê não corresponde à fonte.");
  }
  if (evidence.decision !== "confirmed") throw new Error("Fonte sem decisão confirmed.");
  if (
    !evidence.feedOwnershipConfirmed ||
    !evidence.feedUrl ||
    evidence.feedUrl !== source.feedUrl
  ) {
    throw new Error("Feed não confirmado pelo dossiê oficial.");
  }
  if (!evidence.termsUrl || !evidence.copyrightUrl) {
    throw new Error("Termos ou copyright ausentes; fonte exige revisão.");
  }
  if (normalizedHost(evidence.officialFeedPage) !== normalizedHost(evidence.feedUrl)) {
    throw new Error("Feed sem domínio oficial correspondente.");
  }
  if (/sitemap/i.test(evidence.feedUrl)) throw new Error("Sitemap não pode ser usado como feed.");
  if (/adivinh|guess|tentativa/i.test(evidence.decisionReason)) {
    throw new Error("URL descoberta por tentativa não pode ser ativada.");
  }
}
