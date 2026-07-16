import type { AutomationPolicy } from "./automation-config";
import { checkBudget } from "./automation-budget";
import type { DailyState } from "./daily-state";
import { saveQueue } from "./queue";
import { saveQuarantine } from "./quarantine";
import { collectRealSource } from "./real-collection";
import {
  circuitAllowsAttempt,
  emptyCircuit,
  recordCircuitFailure,
  recordCircuitSuccess,
  saveCircuits,
} from "./retry-circuit";
import { replaceRuntime, runtimeFor, saveRuntime } from "./runtime";

export interface CollectionCounters {
  fetched: number;
  accepted: number;
  rejected: number;
  quarantined: number;
  warnings: string[];
  stopReason?: string;
}

export async function runDailyCollection(
  state: DailyState,
  input: {
    policy: AutomationPolicy;
    actor: string;
    now: Date;
    persist: boolean;
  },
): Promise<{ state: DailyState; counters: CollectionCounters }> {
  const additions = [];
  const counters: CollectionCounters = {
    fetched: 0,
    accepted: 0,
    rejected: 0,
    quarantined: 0,
    warnings: [],
  };
  let { runtimes, quarantine, circuits } = state;
  const targets = state.catalog
    .filter(({ active }) => active)
    .slice(0, input.policy.budgets.sourcesPerRun);
  for (const source of targets) {
    const currentCircuit =
      circuits.find(({ sourceId }) => sourceId === source.id) ?? emptyCircuit(source.id);
    if (!circuitAllowsAttempt(currentCircuit, input.now)) {
      counters.warnings.push(`Circuito aberto: ${source.id}.`);
      continue;
    }
    const outcome = await collectRealSource(source, runtimeFor(source.id, runtimes), quarantine, {
      now: input.now,
      maxItems: input.policy.budgets.itemsPerSource,
      actor: input.actor,
    });
    runtimes = replaceRuntime(runtimes, outcome.runtime);
    if (outcome.quarantine) quarantine = [...quarantine, outcome.quarantine];
    additions.push(...outcome.queueItems);
    const nextCircuit = outcome.error
      ? recordCircuitFailure(currentCircuit, new Error(outcome.error), {
          actor: input.actor,
          threshold: input.policy.circuit.failureThreshold,
          openDurationMs: input.policy.circuit.openDurationMs,
          now: input.now,
        })
      : recordCircuitSuccess(currentCircuit, input.actor, input.now);
    circuits = [...circuits.filter(({ sourceId }) => sourceId !== source.id), nextCircuit];
    counters.fetched += outcome.fetched;
    counters.accepted += outcome.queueItems.length;
    counters.rejected += outcome.rejected;
    counters.quarantined += outcome.quarantine ? 1 : 0;
    const budget = checkBudget("totalItems", counters.fetched, input.policy.budgets.totalItems);
    if (budget.reached) {
      counters.stopReason = budget.reason;
      counters.warnings.push("OrÃ§amento total de itens atingido.");
      break;
    }
  }
  const ids = new Set(state.queue.map(({ id }) => id));
  const queue = [...state.queue, ...additions.filter(({ id }) => !ids.has(id))];
  if (input.persist)
    await Promise.all([
      saveQueue(queue),
      saveRuntime(runtimes),
      saveQuarantine(quarantine),
      saveCircuits(circuits),
    ]);
  return {
    state: { ...state, queue, runtimes, quarantine, circuits },
    counters,
  };
}
