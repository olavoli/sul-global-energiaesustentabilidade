import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { meaningPlan, meaningPayload, decodeMeaning, evidenceFromBatches } from "./meaning";
import { meaningEvidenceSchema, type MeaningEvidence } from "./editorial-policy";
import { append, loadBook, locked, checkBudget, durableCheckpoints } from "./ledger";
import { fingerprint, nanos, policy } from "./policy";
import { freeMargin, freePolicy, type FreeQuotaSource } from "./free-policy";
import { request } from "./translation";
import { cost } from "../i18n-real-pilot/budget";
import { failure, type Dispatch, type Stage } from "./errors";
import { models, type Transport } from "../i18n-real-pilot/adapters";
import { hash, type Locale } from "../i18n-simulation/pipeline";
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const checkpointSchema = z
  .object({
    run: digest,
    findings: meaningEvidenceSchema.shape.findings,
    sourceRevision: digest,
    targetBodyRevision: digest,
    codeRevision: digest,
    model: z.literal(models.cloudflare),
  })
  .strict();
/** One reserved batch per invocation; complete checkpoints are reused, uncertain dispatches never repeated. */
export async function executeMeaning(
  root: string,
  slug: string,
  locale: Locale,
  opts: {
    executionMode: "free-only";
    credentials: { account: string; token: string };
    freeQuota: FreeQuotaSource;
    transport?: Transport;
    persist?: (directory: string) => Promise<void>;
  },
) {
  if (opts.executionMode !== "free-only" || process.env.I18N_OPERATIONS_ALLOW_PAID !== undefined)
    throw Error("meaning-free-only-required");
  if (
    !/^[a-f0-9]{32}$/i.test(opts.credentials.account) ||
    !opts.credentials.token.trim() ||
    /[\r\n]/.test(opts.credentials.token)
  )
    throw Error("invalid-credentials");
  if (process.env.CI === "true" && !opts.persist) throw Error("meaning-durable-state-required");
  const dir = join(root, "i18n/storage");
  return locked(dir, () =>
    durableCheckpoints.run(opts.persist ?? (async () => {}), async () => {
      const p = await meaningPlan(root, slug, locale),
        month = new Date().toISOString().slice(0, 7);
      let book = await loadBook(dir);
      const findings: MeaningEvidence["findings"][] = [];
      for (const batch of p.batches) {
        const run = fingerprint({ meaning: p.id, batch: batch.index }),
          call = `meaning-${locale}:${batch.index}`;
        const file = join(dir, "meaning", p.id, `${batch.index}.json`),
          old = book.runs.get(run);
        if (old) {
          if (old.state !== "complete") throw Error("meaning-reconcile-before-retry");
          const bytes = await readFile(file, "utf8"),
            complete = book.events.find((e) => e.kind === "complete" && e.run === run);
          if (complete?.data.checkpointHash !== hash(bytes))
            throw Error("meaning-checkpoint-invalid");
          const saved = checkpointSchema.parse(JSON.parse(bytes));
          if (
            saved.run !== run ||
            saved.codeRevision !== p.codeRevision ||
            saved.sourceRevision !== p.input.sourceRevision ||
            saved.targetBodyRevision !== p.input.targetBodyRevision
          )
            throw Error("meaning-checkpoint-invalid");
          findings.push(
            decodeMeaning(
              {
                findings: saved.findings.map(({ id, outcome, rationale, resolvedSignals }) => ({
                  id,
                  outcome,
                  rationale,
                  resolvedSignals,
                })),
              },
              batch.pairs,
            ),
          );
          continue;
        }
        const both = await Promise.all(
          (["en", "es"] as const).map((l) => meaningPlan(root, slug, l)),
        );
        const remaining = both.reduce(
          (total, planned) =>
            total +
            planned.batches
              .filter((b) => !book.runs.has(fingerprint({ meaning: planned.id, batch: b.index })))
              .reduce((n, b) => n + b.reserved, 0),
          0,
        );
        checkBudget(book, slug, month, "regular", remaining);
        const snapshot = freeMargin(
          book.events,
          await opts.freeQuota.read(),
          1,
          fingerprint(opts.credentials.account),
        );
        book = await append(dir, book, "reserve", run, {
          article: slug,
          month,
          pool: "regular",
          reserved: batch.reserved,
          executionMode: "free-only",
          purpose: "meaning",
          plan: p.id,
          codeRevision: p.codeRevision,
          sourceRevision: p.input.sourceRevision,
          targetBodyRevision: p.input.targetBodyRevision,
          model: models.cloudflare,
        });
        let dispatch: Dispatch = "not-attempted",
          stage: Stage = "dispatch-record";
        try {
          if ((await meaningPlan(root, slug, locale)).id !== p.id) throw Error("plan-became-stale");
          book = await append(dir, book, "free-quota-reserve", run, {
            call,
            day: snapshot.day,
            accountHash: snapshot.accountHash,
            neurons: freePolicy.callNeurons,
            version: freePolicy.version,
            snapshot,
          });
          book = await append(dir, book, "dispatch", run, { call });
          dispatch = "attempted-unconfirmed";
          stage = "request";
          const result = await request(
            [],
            locale,
            opts.credentials,
            opts.transport,
            true,
            meaningPayload(batch.pairs, locale),
          );
          dispatch = "response-received";
          stage = "usage-record";
          const calculated = nanos(
            cost("cloudflare", result.usage.prompt_tokens, result.usage.completion_tokens),
          );
          book = await append(dir, book, "usage", run, {
            call,
            calculated,
            inputTokens: result.usage.prompt_tokens,
            outputTokens: result.usage.completion_tokens,
            neurons: result.usage.neurons ?? null,
            providerReportedCost: null,
          });
          if (calculated > batch.reserved) throw Error("usage-exceeds-reservation");
          if (result.usage.neurons !== undefined && result.usage.neurons > freePolicy.callNeurons)
            throw Error("free-usage-unverifiable");
          if (
            result.usage.completion_tokens >= policy.maxOutput ||
            [result.finish_reason, result.stop_reason].some(
              (x) => x && !["stop", "end_turn", "eos_token"].includes(x),
            )
          )
            throw Error("incomplete-response");
          if ((await meaningPlan(root, slug, locale)).id !== p.id) throw Error("plan-became-stale");
          stage = "decode";
          const decoded = decodeMeaning(result.response, batch.pairs);
          stage = "write";
          await mkdir(join(dir, "meaning", p.id), { recursive: true });
          const checkpoint = JSON.stringify({
            run,
            findings: decoded,
            sourceRevision: p.input.sourceRevision,
            targetBodyRevision: p.input.targetBodyRevision,
            codeRevision: p.codeRevision,
            model: models.cloudflare,
          });
          await writeFile(file, checkpoint, { flag: "wx", mode: 0o600 });
          stage = "complete-record";
          book = await append(dir, book, "complete", run, {
            output: file,
            checkpointHash: hash(checkpoint),
            purpose: "meaning",
          });
          findings.push(decoded);
          if (findings.flat().length < p.input.pairs.length)
            return {
              state: "PENDING",
              id: p.id,
              remaining: p.input.pairs.length - findings.flat().length,
            };
        } catch (e) {
          const original = failure(e, stage, dispatch);
          if (e instanceof SyntaxError) original.diagnostic.code = "meaning-json-invalid";
          else if (e instanceof Error && /^meaning-[a-z-]+$/.test(e.message))
            original.diagnostic.code = e.message;
          try {
            const current = await loadBook(dir);
            if (["reserved", "running"].includes(current.runs.get(run)?.state ?? ""))
              await append(dir, current, "failed", run, {
                ...original.diagnostic,
                billingConfirmed: null,
                purpose: "meaning",
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
      const evidence = evidenceFromBatches(p, findings),
        destination = join(root, "content/translation-evidence", locale, slug + ".json");
      await mkdir(join(destination, ".."), { recursive: true });
      try {
        await writeFile(destination, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        if (
          JSON.stringify(JSON.parse(await readFile(destination, "utf8"))) !==
          JSON.stringify(evidence)
        )
          throw Error("meaning-evidence-conflict");
      }
      return { state: "EVIDENCE_READY", id: p.id, remaining: 0 };
    }),
  );
}
