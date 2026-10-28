import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Locale } from "../i18n-simulation/pipeline";
import { input, payload } from "./translation";
import { policy, pricing, fingerprint, reservation, usd, type Pool } from "./policy";
import { append, loadBook, locked, checkBudget, held } from "./ledger";
import { failure, guard } from "./errors";
import type { Transport } from "../i18n-real-pilot/adapters";
import { freeMargin, type FreeQuotaSource } from "./free-policy";
import { executeReserved } from "./execution";
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
export async function plan(
  root: string,
  slug: string,
  pool: Pool = "regular",
  now = new Date(),
  locales: readonly Locale[] = ["en", "es"],
) {
  if (
    !locales.length ||
    new Set(locales).size !== locales.length ||
    locales.some((x) => !["en", "es"].includes(x))
  )
    throw Error("translation-locales-invalid");
  const source = await guard("source", "not-attempted", () => input(root, slug)),
    book = await loadBook(join(root, "i18n/storage"));
  const calls = locales.flatMap((locale) =>
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
  mode: "paid" | "free-only" = "paid",
) {
  if (!p.allowed) throw new Error(p.blocked ?? "budget-blocked");
  if (mode === "free-only") {
    if (
      paid !== undefined ||
      authorization !== undefined ||
      contingency !== undefined ||
      p.pool !== "regular"
    )
      throw Error("free-paid-mode-conflict");
    return;
  }
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
    executionMode?: "paid" | "free-only";
    freeQuota?: FreeQuotaSource;
    locales?: readonly Locale[];
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
    const p = await plan(root, slug, opts.pool, new Date(), opts.locales);
    authorize(p, opts.authorization, opts.paid, opts.contingency, opts.executionMode);
    if (opts.executionMode === "free-only") {
      if (!opts.freeQuota) throw Error("free-quota-source-required");
      freeMargin(
        (await loadBook(dir)).events,
        await opts.freeQuota.read(),
        p.calls.length,
        fingerprint(opts.credentials.account),
      );
    }
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
        ...(opts.executionMode === "free-only" ? { executionMode: "free-only" } : {}),
      }),
    );
    return executeReserved(root, slug, opts, p, id, book);
  });
}
export { executeReserved, compileDrafts } from "./execution";
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
