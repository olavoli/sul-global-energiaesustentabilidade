import { resolve } from "node:path";

import { sourceRuntimeSchema, type SourceRuntime } from "./schema";
import { loadStoredDocument, saveStoredDocument } from "./storage/documents";

export const DEFAULT_RUNTIME_PATH = resolve("newsroom/sources/runtime.json");

export async function loadRuntime(path = DEFAULT_RUNTIME_PATH): Promise<SourceRuntime[]> {
  return loadStoredDocument("sources/runtime", sourceRuntimeSchema.array(), [], path);
}

export function runtimeFor(sourceId: string, records: readonly SourceRuntime[]): SourceRuntime {
  return (
    records.find((record) => record.sourceId === sourceId) ??
    sourceRuntimeSchema.parse({ sourceId })
  );
}

export function replaceRuntime(
  records: readonly SourceRuntime[],
  next: SourceRuntime,
): SourceRuntime[] {
  const index = records.findIndex(({ sourceId }) => sourceId === next.sourceId);
  return index < 0
    ? [...records, sourceRuntimeSchema.parse(next)]
    : records.map((record, candidate) =>
        candidate === index ? sourceRuntimeSchema.parse(next) : record,
      );
}

export async function saveRuntime(
  records: readonly SourceRuntime[],
  path = DEFAULT_RUNTIME_PATH,
): Promise<void> {
  await saveStoredDocument("sources/runtime", sourceRuntimeSchema.array(), [...records], path);
}
