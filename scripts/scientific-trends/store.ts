import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  trendRunsDocumentSchema,
  trendSignalsDocumentSchema,
  type TrendRun,
  type TrendSignal,
} from "./contracts";
import { z } from "zod";

export const TREND_SIGNALS_KEY = "scientific-trends/signals";
export const TREND_RUNS_KEY = "scientific-trends/runs";
export const TREND_POLICY_KEY = "scientific-trends/policy-snapshot";
export const TREND_METADATA_KEY = "scientific-trends/metadata";
const emptySignals = { schemaVersion: 1 as const, items: [] as TrendSignal[] };
const emptyRuns = { schemaVersion: 1 as const, items: [] };
const metadataSchema = z.object({
  schemaVersion: z.literal(1),
  checksum: z.string(),
  signalCount: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime().nullable(),
});
const policySnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  policy: z.record(z.string(), z.unknown()),
});

export async function loadTrendState(adapter: StorageAdapter = storageAdapter()) {
  const [signals, runs, metadata, policy] = await Promise.all([
    adapter.getDocument(TREND_SIGNALS_KEY, trendSignalsDocumentSchema, emptySignals),
    adapter.getDocument(TREND_RUNS_KEY, trendRunsDocumentSchema, emptyRuns),
    adapter.getDocument(TREND_METADATA_KEY, metadataSchema, {
      schemaVersion: 1,
      checksum: "0".repeat(64),
      signalCount: 0,
      updatedAt: null,
    }),
    adapter.getDocument(TREND_POLICY_KEY, policySnapshotSchema, { schemaVersion: 1, policy: {} }),
  ]);
  return {
    signals: signals.value.items,
    runs: runs.value.items,
    metadata: metadata.value,
    versions: {
      signals: signals.version,
      runs: runs.version,
      metadata: metadata.version,
      policy: policy.version,
    },
  };
}
export async function saveTrendState(input: {
  signals: TrendSignal[];
  checksum: string;
  run: TrendRun;
  policy: Record<string, unknown>;
  adapter?: StorageAdapter;
}) {
  const adapter = input.adapter ?? storageAdapter();
  const current = await loadTrendState(adapter);
  await adapter.transaction([
    {
      key: TREND_SIGNALS_KEY,
      value: { schemaVersion: 1, items: input.signals },
      expectedVersion: current.versions.signals,
    },
    {
      key: TREND_RUNS_KEY,
      value: { schemaVersion: 1, items: [...current.runs, input.run] },
      expectedVersion: current.versions.runs,
    },
    {
      key: TREND_POLICY_KEY,
      value: { schemaVersion: 1, policy: input.policy },
      expectedVersion: current.versions.policy,
    },
    {
      key: TREND_METADATA_KEY,
      value: {
        schemaVersion: 1,
        checksum: input.checksum,
        signalCount: input.signals.length,
        updatedAt: input.run.completedAt,
      },
      expectedVersion: current.versions.metadata,
    },
  ]);
}
