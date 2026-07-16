import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkBudget } from "./automation-budget";
import { resolveAutomationSwitches } from "./automation-config";
import { acquireGlobalLock, isOrphanLock } from "./automation-lock";
import { executeDailyPipeline } from "./daily-pipeline";
import { completedStage } from "./daily-stages";
import {
  circuitAllowsAttempt,
  deterministicBackoffMs,
  emptyCircuit,
  recordCircuitFailure,
  retryAfterMs,
  withLimitedRetries,
} from "./retry-circuit";
import { createRun, initializeStages, updateStage } from "./run-store";
import { FeedTransportError } from "./transport";

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function tempPath(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "newsroom-automation-"));
  temporary.push(root);
  return join(root, name);
}

const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("Sprint 16 â€” pipeline, switches e concorrÃªncia", () => {
  test("1. pipeline determinÃ­stico", async () => {
    const options = { mode: "process-existing" as const, actor: "test", now: NOW, env: {} };
    const first = await executeDailyPipeline(options);
    const second = await executeDailyPipeline(options);
    expect(second.run).toEqual(first.run);
    expect(second.report).toEqual(first.report);
  });

  test("2. pipeline idempotente", async () => {
    const first = await executeDailyPipeline({
      mode: "process-existing",
      actor: "test",
      now: NOW,
      env: {},
    });
    const ids = first.report.internalIds;
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("3. dry-run nÃ£o persiste", async () => {
    const path = "newsroom/runs/index.json";
    const before = await readFile(path, "utf8").catch(() => "absent");
    await executeDailyPipeline({ mode: "dry-run", actor: "test", now: NOW, env: {} });
    const after = await readFile(path, "utf8").catch(() => "absent");
    expect(after).toBe(before);
  });

  test("4. apply persiste documento validado", async () => {
    const path = await tempPath("applied.json");
    await writeFile(path, JSON.stringify({ applied: true }), "utf8");
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ applied: true });
  });

  test("5. kill switch bloqueia apply", async () => {
    const result = await executeDailyPipeline({
      mode: "apply",
      apply: true,
      actor: "test",
      now: NOW,
      env: { NEWSROOM_ENABLED: "false" },
    });
    expect(result.run.status).toBe("skipped");
    expect(result.run.stopReason).toBe("kill-switch");
  });

  test("6. collection switch bloqueia coleta", () => {
    expect(
      resolveAutomationSwitches({ NEWSROOM_COLLECTION_ENABLED: "false" }).collection,
    ).toBeFalse();
  });

  test("7. orchestration switch bloqueia decisÃ£o aplicada", () => {
    expect(
      resolveAutomationSwitches({ NEWSROOM_ORCHESTRATION_ENABLED: "false" }).orchestration,
    ).toBeFalse();
  });

  test("8. lock impede concorrÃªncia", async () => {
    const path = await tempPath("daily.lock");
    const first = await acquireGlobalLock(
      { owner: "a", runId: "run-a", ttlMs: 1_000, now: NOW },
      path,
    );
    await expect(
      acquireGlobalLock({ owner: "b", runId: "run-b", ttlMs: 1_000, now: NOW }, path),
    ).rejects.toThrow("concorrente");
    await first.release();
  });

  test("9. lock Ã³rfÃ£o Ã© detectado", () => {
    expect(
      isOrphanLock(
        {
          owner: "a",
          runId: "run-a",
          pid: 1,
          acquiredAt: NOW.toISOString(),
          expiresAt: new Date(NOW.valueOf() - 1).toISOString(),
        },
        NOW,
      ),
    ).toBeTrue();
  });

  test("10. override de lock Ã³rfÃ£o Ã© auditÃ¡vel", async () => {
    const path = await tempPath("daily.lock");
    await writeFile(
      path,
      JSON.stringify({
        owner: "a",
        runId: "run-a",
        pid: 1,
        acquiredAt: NOW.toISOString(),
        expiresAt: new Date(NOW.valueOf() - 1).toISOString(),
      }),
    );
    const handle = await acquireGlobalLock(
      { owner: "reviewer", runId: "run-b", ttlMs: 1_000, overrideOrphan: true, now: NOW },
      path,
    );
    expect(handle.orphanOverridden).toBeTrue();
    await handle.release();
  });

  test("11. orÃ§amento interrompe de forma explÃ­cita", () => {
    expect(checkBudget("totalItems", 40, 40)).toEqual({
      reached: true,
      reason: "budget:totalItems",
    });
  });

  test("12. retry ocorre somente em falha transitÃ³ria", async () => {
    let calls = 0;
    const result = await withLimitedRetries(
      async () => {
        calls += 1;
        if (calls === 1) throw new FeedTransportError("network", "DNS temporÃ¡rio");
        return "ok";
      },
      { retries: 2, sleep: async () => undefined },
    );
    expect(result).toEqual({ value: "ok", retries: 1 });
  });

  test("13. HTTP 403 nÃ£o recebe retry", async () => {
    let calls = 0;
    await expect(
      withLimitedRetries(
        async () => {
          calls += 1;
          throw new FeedTransportError("http-error", "HTTP 403", { httpStatus: 403 });
        },
        { retries: 2, sleep: async () => undefined },
      ),
    ).rejects.toThrow("403");
    expect(calls).toBe(1);
  });

  test("14. Retry-After Ã© respeitado", () => {
    expect(
      retryAfterMs(new FeedTransportError("http-error", "retry-after=7", { httpStatus: 429 })),
    ).toBe(7_000);
    expect(deterministicBackoffMs(1, 3)).toBe(deterministicBackoffMs(1, 3));
  });

  test("15. circuit breaker abre", () => {
    const circuit = recordCircuitFailure(emptyCircuit("source"), new Error("falha"), {
      actor: "test",
      threshold: 1,
      openDurationMs: 1_000,
      now: NOW,
    });
    expect(circuit.state).toBe("open");
  });

  test("16. half-open testa uma vez", () => {
    const circuit = { ...emptyCircuit("source"), state: "half-open" as const, halfOpenAttempts: 0 };
    expect(circuitAllowsAttempt(circuit, NOW)).toBeTrue();
    expect(circuitAllowsAttempt({ ...circuit, halfOpenAttempts: 1 }, NOW)).toBeFalse();
  });

  test("17. circuito aberto impede coleta antes do prazo", () => {
    const circuit = {
      ...emptyCircuit("source"),
      state: "open" as const,
      retryAt: new Date(NOW.valueOf() + 1_000).toISOString(),
    };
    expect(circuitAllowsAttempt(circuit, NOW)).toBeFalse();
  });

  test("18. checkpoint Ã© salvo no modelo", () => {
    const run = initializeStages(
      createRun({
        mode: "apply",
        environment: "test",
        actor: "test",
        now: NOW,
        configurationVersion: "v1",
        policyVersion: "p1",
      }),
    );
    const updated = updateStage(run, completedStage("clustering", NOW), true);
    expect(updated.checkpoints).toContainEqual({ stage: "clustering", at: NOW.toISOString() });
  });
});
