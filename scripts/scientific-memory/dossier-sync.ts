import type { ScientificWork } from "../scientific-radar/contracts";
import { loadScientificDossiers, saveScientificDossiers } from "../scientific-radar/store";
import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { attachHistoricalContexts } from "./dossier";
import { stableStringify } from "./identity";
import { loadMemoryState } from "./store";

export async function syncDossierHistoricalContexts(
  works: ScientificWork[],
  adapter: StorageAdapter = storageAdapter(),
): Promise<number> {
  const [memory, dossiers] = await Promise.all([
    loadMemoryState(adapter),
    loadScientificDossiers(adapter),
  ]);
  const next = attachHistoricalContexts(
    dossiers.value.items,
    works,
    memory.metadata.snapshots,
    memory.entities,
  );
  const changed = next.filter(
    (item, index) =>
      stableStringify(item.historicalContext) !==
      stableStringify(dossiers.value.items[index].historicalContext),
  ).length;
  if (changed) await saveScientificDossiers(next, dossiers.version, adapter);
  return changed;
}
