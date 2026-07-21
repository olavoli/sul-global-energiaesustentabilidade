import { createHash } from "node:crypto";
import { normalizeEntityName } from "../entity-resolution/normalize";
import type { MemoryEntityType } from "./contracts";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function memoryIdentity(type: MemoryEntityType, name: string) {
  const normalized = normalizeEntityName(name);
  const suffix = hash(`${type}\u001f${normalized}`).slice(0, 16);
  return { id: `memory-${type}-${suffix}`, canonicalId: `${type}-${suffix}`, normalized };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
