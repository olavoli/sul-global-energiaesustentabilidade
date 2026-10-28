import { mkdir, writeFile, readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { repairLeaves } from "./automatic-repair";
import { input, request, decode, draft, type Input } from "./translation";
import { append, loadBook, type Book } from "./ledger";
import { plan, revision } from "./run";
import { nanos, fingerprint } from "./policy";
import { cost } from "../i18n-real-pilot/budget";
import { failure, guard, type Stage, type Dispatch } from "./errors";
import type { Transport } from "../i18n-real-pilot/adapters";
import { freeMargin, freePolicy, type FreeQuotaSource } from "./free-policy";
/** Internal execution primitive: caller holds the global lock and has persisted authorization/reserve. */
export async function executeReserved(
  root: string,
  slug: string,
  opts: {
    credentials: { account: string; token: string };
    transport?: Transport;
    boundedRepairs?: boolean;
    executionMode?: "paid" | "free-only";
    freeQuota?: FreeQuotaSource;
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
  if (persisted.executionMode === "free-only" && opts.executionMode !== "free-only")
    throw Error("free-mode-mismatch");
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
      if (opts.executionMode === "free-only") {
        if (!opts.freeQuota) throw Error("free-quota-source-required");
        const snapshot = freeMargin(
          book.events,
          await opts.freeQuota.read(),
          1,
          fingerprint(opts.credentials.account),
        );
        book = await append(dir, book, "free-quota-reserve", id, {
          call,
          day: snapshot.day,
          accountHash: snapshot.accountHash,
          neurons: freePolicy.callNeurons,
          version: freePolicy.version,
          snapshot,
        });
      }
      book = await append(dir, book, "dispatch", id, { call });
      stage = "request";
      dispatch = "attempted-unconfirmed";
      const result = await request(
        chunk,
        c.locale,
        opts.credentials,
        opts.transport,
        opts.executionMode === "free-only",
      );
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
      if (
        opts.executionMode === "free-only" &&
        result.usage.neurons !== undefined &&
        result.usage.neurons > freePolicy.callNeurons
      )
        throw Error("free-usage-unverifiable");
      if (calculated > c.reserved) throw new Error("usage-exceeds-reservation");
      if (opts.executionMode === "free-only") {
        const responses = join(dir, "responses", id);
        await mkdir(responses, { recursive: true });
        await writeFile(
          join(responses, call.replace(":", "-") + ".json"),
          JSON.stringify(
            {
              response: result.response,
              usage: result.usage,
              finish_reason: result.finish_reason ?? null,
              mode: "free-only",
              publishable: false,
            },
            null,
            2,
          ),
          { flag: "wx", mode: 0o600 },
        );
      }
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
    const locales = [...new Set(p.calls.map((c) => c.locale))];
    const outputs: Partial<Record<"en" | "es", Awaited<ReturnType<typeof draft>>>> = {};
    for (const locale of locales) outputs[locale] = await draft(source, locale, translated[locale]);
    stage = "write";
    const destination = join(dir, "review", id);
    await mkdir(join(dir, "review"), { recursive: true });
    const pending = join(dir, "review", id + ".pending");
    await mkdir(pending);
    for (const locale of locales) {
      const output = outputs[locale];
      if (!output) throw Error("incomplete-translation");
      await writeFile(join(pending, locale + ".mdx"), output.mdx, {
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
            boundaries: output.boundaries,
            findings: output.findings,
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
          boundaries: { en: outputs.en?.boundaries, es: outputs.es?.boundaries },
          findings: { en: outputs.en?.findings, es: outputs.es?.findings },
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
    return { run: id, locales, status: "REVIEW_REQUIRED", publishable: false, destination };
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
