import { z } from "zod";
export const limits = Object.freeze({
  usd: 1,
  articleUSD: 0.65,
  inputPerCall: 20000,
  outputTranslation: 2500,
  outputReview: 1600,
  inputPerArticle: 400000,
  outputPerArticle: 85000,
  callsPerArticle: 40,
  attempts: 1,
  timeoutMs: 90000,
});
export const rates = {
  cloudflare: { input: 0.293, output: 2.253 },
  openai: { input: 0.75, output: 4.5 },
} as const;
export type Provider = keyof typeof rates;
export const cost = (provider: Provider, input: number, output: number) =>
  (input * rates[provider].input + output * rates[provider].output) / 1e6;
/** Byte ceiling plus framing allowance, deliberately not a measured tokenizer count. */
export const inputEstimate = (payload: unknown) =>
  Buffer.byteLength(JSON.stringify(payload), "utf8") + 512;
export const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  neurons: z.number().nonnegative().nullable(),
  providerReportedCostUSD: z.number().nonnegative().nullable(),
});
export type Usage = z.infer<typeof usageSchema>;
export interface Call {
  startedAt?: string;
  id: string;
  article: string;
  locale: "en" | "es";
  stage: "translation" | "review";
  provider: Provider;
  estimatedInputTokens: number;
  maxOutputTokens: number;
  reservedUSD: number;
  status: "reserved" | "completed" | "failed";
  attempts: 1;
  usage: Usage | null;
  usageCalculatedUSD: number | null;
  differenceUSD: number | null;
  durationMs: number | null;
  errorCode: string | null;
}
export interface Ledger {
  version: "real-pilot-v1";
  calls: Call[];
}
export class Budget {
  private busy = false;
  constructor(
    readonly ledger: Ledger,
    private readonly persist: (ledger: Ledger) => Promise<void>,
  ) {}
  async reserve(
    request: Omit<
      Call,
      | "reservedUSD"
      | "status"
      | "attempts"
      | "usage"
      | "usageCalculatedUSD"
      | "differenceUSD"
      | "durationMs"
      | "errorCode"
    >,
  ): Promise<Call> {
    if (this.busy) throw new Error("concurrent-call-forbidden");
    if (this.ledger.calls.some((c) => c.id === request.id)) throw new Error("retry-forbidden");
    if (this.ledger.calls.some((c) => c.status !== "completed"))
      throw new Error("unreconciled-call-stop");
    if (
      request.estimatedInputTokens > limits.inputPerCall ||
      request.estimatedInputTokens < 1 ||
      !Number.isInteger(request.estimatedInputTokens) ||
      request.maxOutputTokens !==
        (request.stage === "translation" ? limits.outputTranslation : limits.outputReview)
    )
      throw new Error("token-limit");
    const reservedUSD = cost(
      request.provider,
      request.estimatedInputTokens,
      request.maxOutputTokens,
    );
    const held = (calls: Call[]) =>
      calls.reduce((n, c) => n + Math.max(c.reservedUSD, c.usageCalculatedUSD ?? 0), 0);
    const article = this.ledger.calls.filter((c) => c.article === request.article);
    if (
      held(this.ledger.calls) + reservedUSD > limits.usd ||
      held(article) + reservedUSD > limits.articleUSD
    )
      throw new Error("projected-budget-exceeded");
    if (
      article.length >= limits.callsPerArticle ||
      article.reduce((n, c) => n + c.estimatedInputTokens, 0) + request.estimatedInputTokens >
        limits.inputPerArticle ||
      article.reduce((n, c) => n + c.maxOutputTokens, 0) + request.maxOutputTokens >
        limits.outputPerArticle
    )
      throw new Error("article-limit");
    const call: Call = {
      ...request,
      startedAt: new Date().toISOString(),
      reservedUSD,
      status: "reserved",
      attempts: 1,
      usage: null,
      usageCalculatedUSD: null,
      differenceUSD: null,
      durationMs: null,
      errorCode: null,
    };
    this.busy = true;
    this.ledger.calls.push(call);
    // Persist BEFORE sending; a crash leaves a reservation and forbids retry.
    await this.persist(this.ledger);
    return call;
  }
  async complete(call: Call, usage: Usage, durationMs: number) {
    call.usage = usageSchema.parse(usage);
    call.usageCalculatedUSD = cost(call.provider, usage.inputTokens, usage.outputTokens);
    call.differenceUSD = call.usageCalculatedUSD - call.reservedUSD;
    call.durationMs = durationMs;
    call.status = "completed";
    this.busy = false;
    await this.persist(this.ledger);
    if (usage.inputTokens > call.estimatedInputTokens || usage.outputTokens > call.maxOutputTokens)
      throw new Error("usage-exceeded-local-estimate-stop");
  }
  async fail(call: Call, code: string, durationMs: number) {
    call.status = "failed";
    call.errorCode = code;
    call.durationMs = durationMs;
    this.busy = false;
    await this.persist(this.ledger);
  }
}
