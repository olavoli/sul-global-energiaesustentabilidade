import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { loadScientificDossiers, saveScientificDossiers } from "../scientific-radar/store";
import { stableStringify } from "../scientific-memory/identity";
import type { TrendSignal } from "./contracts";
import { attachTrendStructure } from "./dossier";

export async function syncTrendDossiers(
  signals: TrendSignal[],
  adapter: StorageAdapter = storageAdapter(),
): Promise<number> {
  const current = await loadScientificDossiers(adapter);
  const next = current.value.items.map((dossier) => attachTrendStructure(dossier, signals));
  const changed = next.filter(
    (dossier, index) => stableStringify(dossier) !== stableStringify(current.value.items[index]),
  ).length;
  if (changed) await saveScientificDossiers(next, current.version, adapter);
  return changed;
}
