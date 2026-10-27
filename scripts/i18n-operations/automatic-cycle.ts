import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { discover } from "./automatic-discovery";
import { authorizeContinuous, continuousBudget, maximumCallReserve } from "./automation-policy";
import { loadBook, append, locked, durableCheckpoints } from "./ledger";
import { plan, executeReserved } from "./run";
import { fingerprint, usd } from "./policy";
import { publicationCandidate, installCandidates } from "./automatic-publication";
import type { Transport } from "../i18n-real-pilot/adapters";
import { failure } from "./errors";
export interface CycleDependencies {
  simulation: boolean;
  externalEnabled?: boolean;
  credentialsVerified?: boolean;
  credentials: { account: string; token: string };
  transport?: Transport;
  persist: (directory: string) => Promise<void>;
  publish?: (root: string, slug: string, editions: { en: string; es: string }) => Promise<void>;
}
export async function runAutomaticCycle(root: string, rawPolicy: unknown, deps: CycleDependencies) {
  const auth = authorizeContinuous(rawPolicy);
  if (!deps.simulation && (!deps.externalEnabled || !deps.credentialsVerified))
    throw Error("automatic-external-disabled");
  if (deps.simulation && !deps.transport) throw Error("automatic-mock-transport-required");
  if (
    !/^[a-f0-9]{32}$/i.test(deps.credentials.account) ||
    !deps.credentials.token.trim() ||
    /[\r\n]/.test(deps.credentials.token)
  )
    throw Error("invalid-credentials");
  const directory = join(root, "i18n/storage");
  return locked(directory, () =>
    durableCheckpoints.run(deps.persist, async () => {
      let book = await loadBook(directory);
      if (!deps.simulation && book.events.length === 0)
        throw Error("automatic-durable-history-required");
      if (
        book.events.length &&
        !book.events.some((e) => e.digest === auth.policy.historyAnchor) &&
        !(
          deps.simulation &&
          book.events[0]?.kind === "automatic-authorize" &&
          book.events[0]?.run === auth.id
        )
      )
        throw Error("automatic-history-anchor-mismatch");
      if (!book.events.some((e) => e.kind === "automatic-authorize" && e.run === auth.id))
        book = await append(directory, book, "automatic-authorize", auth.id, {
          policy: auth.policy,
        });
      const report: { article: string; state: string; code?: string; run?: string }[] = [];
      let processed = 0;
      for (const candidate of await discover(root)) {
        if (candidate.state !== "PENDING") {
          report.push({ article: candidate.slug, state: candidate.state });
          continue;
        }
        if (processed >= 3) {
          report.push({ article: candidate.slug, state: "PENDING" });
          continue;
        }
        const slug = candidate.slug;
        let counted = false;
        book = await loadBook(directory);
        const history = book.events.filter(
          (e) =>
            e.kind === "automatic-reserve" &&
            e.data.key &&
            typeof e.data.key === "object" &&
            "sourceRevision" in e.data.key &&
            e.data.key.sourceRevision === candidate.sourceRevision &&
            e.data.article === slug,
        );
        let completed = history.find((e) => book.runs.get(e.run)?.state === "complete");
        let active: string | undefined;
        try {
          if (!completed) {
            if (
              history.some((e) => {
                const r = book.runs.get(e.run);
                return r && r.state !== "complete" && r.calls.size > r.usage.size;
              })
            )
              throw Error("automatic-uncertain-run-quarantined");
            let attempt = history.length + 1;
            while (attempt <= auth.policy.maxAttempts) {
              const base = await plan(root, slug),
                reserved = base.calls.length * maximumCallReserve(),
                month = new Date().toISOString().slice(0, 7),
                pool: "regular" | "contingency" = attempt === 1 ? "regular" : "contingency";
              const exposure = continuousBudget(
                [...book.runs.values()],
                slug,
                month,
                pool,
                reserved,
                auth.policy,
              );
              active = fingerprint({
                authorization: auth.id,
                article: slug,
                sourceRevision: candidate.sourceRevision,
                attempt,
              });
              const individual = {
                ...base,
                month,
                pool,
                calls: base.calls.map((c) => ({ ...c, reserved: maximumCallReserve() })),
                reserved,
                reservedUSD: usd(reserved),
                planHash: active,
                allowed: true,
                blocked: null,
              };
              if (!counted) {
                processed++;
                counted = true;
              }
              book = await append(directory, book, "automatic-reserve", active, {
                authorization: auth.id,
                article: slug,
                month,
                pool,
                reserved,
                plan: individual,
                key: { sourceRevision: candidate.sourceRevision, attempt },
                exposure,
              });
              try {
                await executeReserved(
                  root,
                  slug,
                  { ...deps, boundedRepairs: true },
                  individual,
                  active,
                  book,
                );
                book = await loadBook(directory);
                completed = book.events.find(
                  (e) => e.kind === "automatic-reserve" && e.run === active,
                );
                break;
              } catch (e) {
                book = await loadBook(directory);
                const r = book.runs.get(active),
                  diagnostic = failure(e, "preflight").diagnostic;
                if (
                  diagnostic.code === "provider-auth-rejected" ||
                  diagnostic.code === "state-persistence-failed" ||
                  diagnostic.failureRecordCode
                )
                  throw e;
                const recoverable = [
                  "incomplete-response",
                  "translation-json-invalid",
                  "translation-incomplete-or-ids-invalid",
                ].includes(diagnostic.code);
                if (
                  !r ||
                  r.calls.size !== r.usage.size ||
                  !recoverable ||
                  attempt === auth.policy.maxAttempts
                )
                  throw e;
                attempt++;
              }
            }
          }
          if (!completed) throw Error("automatic-attempt-limit");
          const completedRun = completed.run;
          const output = join(directory, "review", completedRun);
          const validatedAt = new Date(
            book.events.find((e) => e.kind === "complete" && e.run === completedRun)?.at ??
              new Date().toISOString(),
          );
          const en = await publicationCandidate(
            root,
            slug,
            "en",
            await readFile(join(output, "en.mdx"), "utf8"),
            auth.id,
            completed.run,
            validatedAt,
          );
          const es = await publicationCandidate(
            root,
            slug,
            "es",
            await readFile(join(output, "es.mdx"), "utf8"),
            auth.id,
            completed.run,
            validatedAt,
          );
          await (deps.publish ?? installCandidates)(root, slug, { en, es });
          await deps.persist(directory);
          report.push({
            article: slug,
            state: deps.simulation ? "SIMULATED_PUBLICATION" : "MATERIALIZED",
            run: completed.run,
          });
        } catch (e) {
          const diagnostic = failure(e, "preflight").diagnostic;
          report.push({ article: slug, state: "QUARANTINED", code: diagnostic.code, run: active });
          if (
            [
              "provider-auth-rejected",
              "state-persistence-failed",
              "ledger-integrity",
              "ledger-head-mismatch",
            ].includes(diagnostic.code) ||
            diagnostic.failureRecordCode
          )
            break;
        }
      }
      const output = join(directory, "automation/reports");
      await mkdir(output, { recursive: true });
      await writeFile(
        join(output, randomUUID() + ".json"),
        JSON.stringify(
          { policy: auth.id, simulation: deps.simulation, at: new Date().toISOString(), report },
          null,
          2,
        ),
        { flag: "wx", mode: 0o600 },
      );
      await deps.persist(directory);
      return report;
    }),
  );
}
