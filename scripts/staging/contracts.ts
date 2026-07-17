import { z } from "zod";

export const formalEnvironments = [
  "development",
  "test",
  "preview",
  "staging",
  "production",
] as const;

export const formalEnvironmentSchema = z.enum(formalEnvironments);

const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  homepage: z.url(),
  feedUrl: z.url(),
  active: z.literal(false),
});

const itemSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  title: z.string().min(1).max(180),
  originalUrl: z.url(),
  snippet: z.string().min(1).max(500),
});

export const stagingSeedSchema = z
  .object({
    version: z.literal(1),
    environment: z.literal("staging"),
    kind: z.literal("sanitized-fixture"),
    sources: z.array(sourceSchema).min(1),
    items: z.array(itemSchema).min(1),
    clusters: z.array(
      z.object({
        id: z.string(),
        itemIds: z.array(z.string()).min(1),
        status: z.literal("review-required"),
      }),
    ),
    decisions: z.array(
      z.object({
        id: z.string(),
        clusterId: z.string(),
        status: z.literal("human-review-required"),
        recommendation: z.literal("monitor"),
      }),
    ),
    inbox: z.array(
      z.object({
        id: z.string(),
        decisionId: z.string(),
        status: z.literal("pending"),
      }),
    ),
    runs: z.array(
      z.object({
        id: z.string(),
        mode: z.literal("validate-only"),
        status: z.literal("completed"),
        dryRun: z.literal(true),
      }),
    ),
    reports: z.array(
      z.object({
        id: z.string(),
        runId: z.string(),
        summary: z.string().max(240),
      }),
    ),
  })
  .strict();

export type StagingSeed = z.infer<typeof stagingSeedSchema>;

export interface StagingEnvironmentInput {
  appEnvironment?: string;
  newsroomEnvironment?: string;
  storageDriver?: string;
  stagingBaseUrl?: string;
  productionBaseUrl?: string;
}

export function validateStagingEnvironment(input: StagingEnvironmentInput): void {
  const app = formalEnvironmentSchema.parse(input.appEnvironment);
  const newsroom = formalEnvironmentSchema.parse(input.newsroomEnvironment);
  if (app !== "staging" || newsroom !== "staging")
    throw new Error("Configuração de staging deve declarar ambos os ambientes como staging.");
  if (input.storageDriver !== "d1")
    throw new Error("Staging exige o driver D1; filesystem local não é permitido.");
  const stagingUrl = new URL(input.stagingBaseUrl ?? "");
  if (!["https:"].includes(stagingUrl.protocol) || stagingUrl.hostname === "localhost")
    throw new Error("Staging exige URL HTTPS distinta e explícita.");
  if (input.productionBaseUrl) {
    const productionUrl = new URL(input.productionBaseUrl);
    if (stagingUrl.origin === productionUrl.origin)
      throw new Error("Staging não pode apontar para a origem de produção.");
  }
}

export function assertSanitizedSeed(value: unknown): StagingSeed {
  const seed = stagingSeedSchema.parse(value);
  const serialized = JSON.stringify(seed).toLowerCase();
  const forbidden = [
    "secret",
    "cookie",
    "password",
    "session",
    "token",
    "published",
    "contentbody",
  ];
  for (const term of forbidden) {
    if (serialized.includes(term)) throw new Error(`Seed contém termo proibido: ${term}.`);
  }
  return seed;
}
