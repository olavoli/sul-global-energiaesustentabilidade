import { repairLeaves } from "./automatic-repair";
import { readFile, readdir, mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { input, payload, request, decode, draft, type Input } from "./translation";
import { policy, pricing, fingerprint, reservation, nanos, usd, type Pool } from "./policy";
import { append, loadBook, locked, checkBudget, held, type Book } from "./ledger";
import { cost } from "../i18n-real-pilot/budget";
import { failure, guard, type Stage, type Dispatch } from "./errors";
import type { Transport } from "../i18n-real-pilot/adapters";
export async function revision(root: string) {
  const paths = [
    "scripts/i18n-operations",
    "scripts/i18n-simulation/pipeline.ts",
    "scripts/i18n-real-pilot/adapters.ts",
    "scripts/i18n-real-pilot/budget.ts",
    "scripts/i18n-real-pilot/sample.ts",
    "scripts/i18n-cloudflare-experiment/experiment.ts",
    "scripts/generate-content.ts",
    "src/content/schema.ts",
    "src/content/translation-schema.ts",
    "src/content/remark-editorial-slots.ts",
    "bun.lock",
    "package.json",
  ];
  const files: Record<string, string> = {};
  for (const path of paths) {
    if (path === "scripts/i18n-operations") {
      for (const name of (await readdir(join(root, path))).sort())
        if (name.endsWith(".ts") && !name.endsWith(".test.ts"))
          files[path + "/" + name] = await readFile(join(root, path, name), "utf8");
    } else files[path] = await readFile(join(root, path), "utf8");
  }
  return fingerprint(files);
}
export async function plan(root: string, slug: string, pool: Pool = "regular", now = new Date()) {
  const source = await guard("source", "not-attempted", () => input(root, slug)),
    book = await loadBook(join(root, "i18n/storage"));
  const calls = (["en", "es"] as const).flatMap((locale) =>
    source.chunks.map((chunk, index) => ({
      locale,
      index,
      reserved: reservation(payload(chunk, locale)),
      ids: chunk.map((s) => s.id),
    })),
  );
  const reserve = calls.reduce((n, c) => n + c.reserved, 0),
    month = now.toISOString().slice(0, 7);
  let blocked: string | null = null;
  try {
    checkBudget(book, slug, month, pool, reserve);
  } catch (e) {
    blocked = (e as Error).message;
  }
  const body = {
    article: slug,
    month,
    pool,
    sourceRevision: source.sourceRevision,
    codeRevision: await revision(root),
    policy,
    pricing,
    history: book.digest,
    calls,
    reserved: reserve,
  };
  return {
    ...body,
    planHash: fingerprint(body),
    allowed: !blocked,
    blocked,
    reservedUSD: usd(reserve),
    articleHeldUSD: usd(
      [...book.runs.values()].filter((r) => r.article === slug).reduce((n, r) => n + held(r), 0),
    ),
    billingConfirmed: false,
  };
}
export function authorize(
  p: Awaited<ReturnType<typeof plan>>,
  authorization: string | undefined,
  paid: string | undefined,
  contingency: string | undefined,
) {
  if (!p.allowed) throw new Error(p.blocked ?? "budget-blocked");
  if (paid !== "1" || authorization !== p.planHash)
    throw new Error("explicit-financial-authorization-required");
  if (p.pool === "contingency" && !contingency?.trim())
    throw new Error("contingency-authorization-required");
}
export async function execute(
  root: string,
  slug: string,
  opts: {
    authorization?: string;
    paid?: string;
    contingency?: string;
    pool?: Pool;
    credentials: { account: string; token: string };
    transport?: Transport;
  },
) {
  if (
    !/^[a-f0-9]{32}$/i.test(opts.credentials.account) ||
    !opts.credentials.token.trim() ||
    /[\r\n]/.test(opts.credentials.token)
  )
    throw new Error("invalid-credentials");
  const dir = join(root, "i18n/storage");
  return locked(dir, async () => {
    const p = await plan(root, slug, opts.pool);
    authorize(p, opts.authorization, opts.paid, opts.contingency);
    let book = await loadBook(dir);
    const source = await guard("source", "not-attempted", () => input(root, slug));
    if (source.sourceRevision !== p.sourceRevision) throw new Error("source-changed");
    const id = p.planHash;
    book = await guard("reserve", "not-attempted", () =>
      append(dir, book, "reserve", id, {
        article: slug,
        month: p.month,
        pool: p.pool,
        reserved: p.reserved,
        plan: p,
        contingency: opts.contingency ?? null,
      }),
    );
    return executeReserved(root, slug, opts, p, id, book);
  });
}
/** Internal execution primitive: caller holds the global lock and has persisted authorization/reserve. */
export async function executeReserved(
  root: string,
  slug: string,
  opts: {
    credentials: { account: string; token: string };
    transport?: Transport;
    boundedRepairs?: boolean;
  },
  p: Awaited<ReturnType<typeof plan>>,
  id: string,
  book: Book,
) {
  const dir = join(root, "i18n/storage");
  const persisted = book.runs.get(id);
  if (
    !persisted ||
    persisted.article !== slug ||
    persisted.reserved !== p.reserved ||
    persisted.state !== "reserved" ||
    persisted.calls.size
  )
    throw new Error("execution-reservation-invalid");
  const source = await guard("source", "not-attempted", () => input(root, slug));
  if (source.sourceRevision !== p.sourceRevision) throw new Error("source-changed");
  const repairLog: { locale: "en" | "es"; id: string; repair: string }[] = [];
  const translated = { en: {} as Record<string, string>, es: {} as Record<string, string> };
  let stage: Stage = "source",
    dispatch: Dispatch = "not-attempted";
  let activeCall: string | undefined;
  try {
    for (const c of p.calls) {
      // Recheck the exact plan inputs immediately before every dispatch.
      if (
        (await revision(root)) !== p.codeRevision ||
        (await input(root, slug)).sourceRevision !== p.sourceRevision ||
        new Date().toISOString().slice(0, 7) !== p.month
      )
        throw new Error("plan-became-stale");
      const chunk = source.chunks[c.index],
        call = `${c.locale}:${c.index}`;
      stage = "dispatch-record";
      activeCall = call;
      book = await append(dir, book, "dispatch", id, { call });
      stage = "request";
      dispatch = "attempted-unconfirmed";
      const result = await request(chunk, c.locale, opts.credentials, opts.transport);
      dispatch = "response-received";
      stage = "usage-record";
      const calculated = nanos(
        cost("cloudflare", result.usage.prompt_tokens, result.usage.completion_tokens),
      );
      book = await append(dir, book, "usage", id, {
        call,
        calculated,
        inputTokens: result.usage.prompt_tokens,
        outputTokens: result.usage.completion_tokens,
        neurons: result.usage.neurons ?? null,
        providerReportedCost: null,
      });
      if (calculated > c.reserved) throw new Error("usage-exceeds-reservation");
      stage = "decode";
      const returned = decode(result, chunk);
      const repaired = opts.boundedRepairs
        ? repairLeaves(source, c.locale, returned)
        : { translations: returned, changes: [] };
      repairLog.push(...repaired.changes.map((change) => ({ ...change, locale: c.locale })));
      const decoded = repaired.translations;
      for (const [key, text] of Object.entries(decoded)) {
        if (key in translated[c.locale]) throw new Error("duplicate-id");
        translated[c.locale][key] = text;
      }
    }
    if (
      (await input(root, slug)).sourceRevision !== p.sourceRevision ||
      (await revision(root)) !== p.codeRevision
    )
      throw new Error("plan-became-stale");
    stage = "mdx";
    const outputs = await compileDrafts(source, translated);
    stage = "write";
    const destination = join(dir, "review", id);
    await mkdir(join(dir, "review"), { recursive: true });
    const pending = join(dir, "review", id + ".pending");
    await mkdir(pending);
    for (const locale of ["en", "es"] as const) {
      await writeFile(join(pending, locale + ".mdx"), outputs[locale].mdx, {
        flag: "wx",
        mode: 0o600,
      });
      await writeFile(
        join(pending, locale + ".review.json"),
        JSON.stringify(
          {
            article: slug,
            locale,
            run: id,
            status: "REVIEW_REQUIRED",
            humanReview: "pending",
            publishable: false,
            sourceRevision: source.sourceRevision,
            boundaries: outputs[locale].boundaries,
            findings: outputs[locale].findings,
            repairs: repairLog.filter((change) => change.locale === locale),
          },
          null,
          2,
        ),
        { flag: "wx", mode: 0o600 },
      );
    }
    await writeFile(
      join(pending, "review.json"),
      JSON.stringify(
        {
          status: "REVIEW_REQUIRED",
          publishable: false,
          run: id,
          sourceRevision: source.sourceRevision,
          boundaries: { en: outputs.en.boundaries, es: outputs.es.boundaries },
          findings: { en: outputs.en.findings, es: outputs.es.findings },
          repairs: repairLog,
        },
        null,
        2,
      ),
      { flag: "wx", mode: 0o600 },
    );
    await rename(pending, destination);
    stage = "complete-record";
    book = await append(dir, book, "complete", id, { output: destination });
    return { run: id, status: "REVIEW_REQUIRED", publishable: false, destination };
  } catch (e) {
    const original = failure(e, stage, dispatch);
    try {
      // Reread the checkpoint: never overwrite an uncertain or newer ledger with stale state.
      const current = await loadBook(dir);
      if (["reserved", "running"].includes(current.runs.get(id)?.state ?? ""))
        await append(dir, current, "failed", id, {
          ...original.diagnostic,
          ...(activeCall ? { call: activeCall } : {}),
          billingConfirmed: null,
        });
    } catch (recordError) {
      original.diagnostic.failureRecordCode = failure(
        recordError,
        "write",
        dispatch,
      ).diagnostic.code;
    }
    throw original;
  }
}
export async function compileDrafts(
  source: Input,
  translations: { en: Record<string, string>; es: Record<string, string> },
) {
  const en = await draft(source, "en", translations.en);
  const es = await draft(source, "es", translations.es);
  return { en, es };
}
export { reconcile, confirmBilling, summary } from "./operations-finance";
if (import.meta.main)
  import("./operations-cli")
    .then((m) => m.main())
    .catch((error) => {
      console.error(
        JSON.stringify({
          status: "BLOCKED",
          ...failure(error, "preflight").diagnostic,
          retryAutomatically: false,
        }),
      );
      process.exitCode = 1;
    });
