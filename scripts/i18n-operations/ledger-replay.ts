import { validateFreeReservation, freePolicy } from "./free-policy";
import { eventSchema, money, type Event, type Book, type Run } from "./ledger-types";
import { batchPlanSchema, batchRunId } from "./batch-schema";
import { fingerprint, type Pool } from "./policy";
import { automaticPolicySchema, continuousBudget } from "./automation-policy";
import { checkBudget, checkBatchBudget } from "./ledger-budget";
function amount(value: unknown) {
  return money.parse(value);
}
export function replay(events: Event[]): Book {
  const runs = new Map<string, Run>();
  let digest = "GENESIS";
  for (const raw of events) {
    const e = eventSchema.parse(raw);
    const { digest: claimed, ...body } = e;
    if (
      e.sequence !== events.indexOf(raw) + 1 ||
      e.previous !== digest ||
      fingerprint(body) !== claimed
    )
      throw new Error("ledger-integrity");
    digest = claimed;
    const r = runs.get(e.run),
      d = e.data;
    if (e.kind === "automatic-authorize") {
      const authorization = automaticPolicySchema.parse(d.policy);
      if (fingerprint(authorization) !== e.run) throw Error("automatic-policy-integrity");
      continue;
    }
    if (e.kind === "automatic-reserve") {
      const authorization = events
        .slice(0, e.sequence - 1)
        .find((x) => x.kind === "automatic-authorize" && x.run === d.authorization);
      if (!authorization || r) throw Error("automatic-authorization-missing");
      const authorized = automaticPolicySchema.parse(authorization.data.policy);
      if (new Date(authorized.validUntil) <= new Date(e.at))
        throw Error("automatic-authorization-expired");
      const article = String(d.article),
        month = String(d.month),
        pool = d.pool as "regular" | "contingency",
        reserved = amount(d.reserved);
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article) ||
        !/^\d{4}-\d{2}$/.test(month) ||
        !["regular", "contingency"].includes(pool)
      )
        throw Error("automatic-invalid-reserve");
      continuousBudget([...runs.values()], article, month, pool, reserved, authorized);
      runs.set(e.run, {
        id: e.run,
        article,
        month,
        pool,
        reserved,
        calculated: 0,
        confirmed: null,
        state: "reserved",
        reconciled: false,
        calls: new Set(),
        usage: new Set(),
        authorization: String(d.authorization),
      });
      continue;
    }
    if (e.kind === "batch-reserve") {
      const plan = batchPlanSchema.parse(d.plan);
      if (
        fingerprint(plan) !== e.run ||
        !String(d.operator ?? "").trim() ||
        (plan.pool === "contingency" && !String(d.contingency ?? "").trim()) ||
        events
          .slice(0, e.sequence - 1)
          .some((x) => x.kind === "batch-reserve" && x.run === e.run) ||
        plan.history !== e.previous
      )
        throw new Error("batch-plan-invalid");
      checkBatchBudget({ events: [], digest: e.previous, runs }, plan);
      for (const a of plan.articles) {
        const id = batchRunId(e.run, a.article);
        if (runs.has(id)) throw new Error("batch-run-duplicate");
        runs.set(id, {
          id,
          article: a.article,
          month: plan.month,
          pool: plan.pool,
          reserved: a.reserved,
          calculated: 0,
          confirmed: null,
          state: "pending",
          reconciled: false,
          calls: new Set(),
          usage: new Set(),
          batch: e.run,
        });
      }
      continue;
    }
    if (e.kind === "batch-cancel") {
      if (
        !String(d.operator ?? "").trim() ||
        !String(d.reason ?? "").trim() ||
        !events.slice(0, e.sequence - 1).some((x) => x.kind === "batch-reserve" && x.run === e.run)
      )
        throw new Error("batch-cancel-invalid");
      const unused = [...runs.values()].filter(
        (x) => x.batch === e.run && ["pending", "reserved"].includes(x.state) && x.calls.size === 0,
      );
      if (!unused.length) throw new Error("batch-no-unused-reservations");
      for (const unusedRun of unused) {
        unusedRun.state = "cancelled";
        unusedRun.reconciled = true;
      }
      continue;
    }

    if (e.kind === "free-quota-reserve") {
      if (!r || r.executionMode !== "free-only" || !["reserved", "running"].includes(r.state))
        throw Error("free-reservation-invalid");
      validateFreeReservation(events, e);
      continue;
    }
    if (e.kind === "reserve") {
      if (
        r ||
        typeof d.article !== "string" ||
        !/^\d{4}-\d{2}$/.test(String(d.month)) ||
        !["regular", "contingency"].includes(String(d.pool))
      )
        throw new Error("invalid-reservation");
      const reserved = amount(d.reserved);
      if (!reserved) throw new Error("empty-reservation");
      const continuous = events
        .slice(0, e.sequence - 1)
        .reverse()
        .find((x) => x.kind === "automatic-authorize");
      if (continuous) {
        const authorization = automaticPolicySchema.parse(continuous.data.policy);
        if (new Date(authorization.validUntil) <= new Date(e.at))
          throw Error("automatic-authorization-expired");
        continuousBudget(
          [...runs.values()],
          String(d.article),
          String(d.month),
          d.pool as Pool,
          reserved,
          authorization,
        );
      }
      checkBudget(
        { events: [], digest, runs },
        String(d.article),
        String(d.month),
        d.pool as Pool,
        reserved,
      );
      runs.set(e.run, {
        ...(d.executionMode === "free-only" ? { executionMode: "free-only" as const } : {}),
        id: e.run,
        article: d.article,
        month: String(d.month),
        pool: d.pool as Pool,
        reserved,
        calculated: 0,
        confirmed: null,
        state: "reserved",
        reconciled: false,
        calls: new Set(),
        usage: new Set(),
      });
      continue;
    }
    if (!r) throw new Error("unknown-run");
    if (e.kind === "batch-start") {
      if (!r.batch || r.state !== "pending" || r.calls.size) throw new Error("batch-start-invalid");
      r.state = "reserved";
    }
    if (e.kind === "dispatch") {
      if (r.executionMode === "free-only") {
        const quota = events
          .slice(0, e.sequence - 1)
          .reverse()
          .find(
            (x) => x.kind === "free-quota-reserve" && x.run === e.run && x.data.call === d.call,
          );
        if (
          !quota ||
          quota.data.day !== e.at.slice(0, 10) ||
          new Date(e.at).getTime() -
            new Date(String((quota.data.snapshot as { asOf: string }).asOf)).getTime() >
            freePolicy.maximumAgeMs
        )
          throw Error("free-dispatch-unreserved");
      }
      if (r.authorization) {
        const auth = events
          .slice(0, e.sequence - 1)
          .find((x) => x.kind === "automatic-authorize" && x.run === r.authorization);
        if (
          !auth ||
          new Date(automaticPolicySchema.parse(auth.data.policy).validUntil) <= new Date(e.at)
        )
          throw Error("automatic-authorization-expired");
      }
      if (
        !["reserved", "running"].includes(r.state) ||
        typeof d.call !== "string" ||
        r.calls.has(d.call)
      )
        throw new Error("duplicate-or-closed-call");
      r.calls.add(d.call);
      r.state = "running";
    }
    if (e.kind === "usage") {
      if (
        typeof d.call !== "string" ||
        !r.calls.has(d.call) ||
        r.usage.has(d.call) ||
        r.state !== "running"
      )
        throw new Error("invalid-usage");
      r.usage.add(d.call);
      r.calculated += amount(d.calculated);
      if (!Number.isSafeInteger(r.calculated)) throw new Error("invalid-money");
    }
    if (e.kind === "complete" || e.kind === "failed") {
      if (!["reserved", "running"].includes(r.state)) throw new Error("closed-run");
      r.state = e.kind;
    }
    if (e.kind === "billing") {
      if (
        !r.reconciled ||
        r.confirmed !== null ||
        !String(d.operator ?? "").trim() ||
        !String(d.reason ?? "").trim() ||
        !String(d.evidence ?? "").trim()
      )
        throw new Error("invalid-billing-confirmation");
      r.confirmed = amount(d.confirmed);
    }
    if (e.kind === "reconcile") {
      if (r.reconciled || !String(d.reason ?? "").trim() || !String(d.operator ?? "").trim())
        throw new Error("invalid-reconciliation");
      if (d.confirmed !== null) {
        r.confirmed = amount(d.confirmed);
        if (!String(d.evidence ?? "").trim()) throw new Error("billing-evidence-required");
      }
      r.reconciled = true;
      if (["running", "reserved"].includes(r.state)) r.state = "failed";
    }
  }
  return { events, digest, runs };
}
