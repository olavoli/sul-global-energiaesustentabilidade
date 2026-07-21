import { createHash } from "node:crypto";
import type { EntityMemory, MemoryEntityType, MemoryTimeline } from "./contracts";
import { memoryEntityTypes } from "./contracts";
import { stableStringify } from "./identity";

export function memoryChecksum(
  entities: Record<MemoryEntityType, EntityMemory[]>,
  timeline: MemoryTimeline,
): string {
  const canonical = {
    entities: Object.fromEntries(
      memoryEntityTypes.map((type) => [
        type,
        [...entities[type]].sort((left, right) => left.id.localeCompare(right.id)),
      ]),
    ),
    timeline,
  };
  return createHash("sha256").update(stableStringify(canonical)).digest("hex").toUpperCase();
}
