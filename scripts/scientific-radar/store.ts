import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  scientificDossiersDocumentSchema,
  scientificRadarDocumentSchema,
  type ScientificDossier,
  type ScientificRadarDocument,
  type ScientificWork,
} from "./contracts";

export const RADAR_KEY = "scientific-radar/items";
export const DOSSIERS_KEY = "scientific-radar/dossiers";

const emptyRadar: ScientificRadarDocument = { schemaVersion: 2, lastRunAt: null, items: [] };
const emptyDossiers = { schemaVersion: 2 as const, items: [] as ScientificDossier[] };

export async function loadScientificRadar(adapter: StorageAdapter = storageAdapter()) {
  return adapter.getDocument(RADAR_KEY, scientificRadarDocumentSchema, emptyRadar);
}

export async function saveScientificRadar(
  value: ScientificRadarDocument,
  expectedVersion: number,
  adapter: StorageAdapter = storageAdapter(),
): Promise<void> {
  await adapter.putDocument(
    { key: RADAR_KEY, value, expectedVersion },
    scientificRadarDocumentSchema,
  );
}

export async function loadScientificDossiers(adapter: StorageAdapter = storageAdapter()) {
  return adapter.getDocument(DOSSIERS_KEY, scientificDossiersDocumentSchema, emptyDossiers);
}

export async function saveScientificDossiers(
  items: ScientificDossier[],
  expectedVersion: number,
  adapter: StorageAdapter = storageAdapter(),
): Promise<void> {
  await adapter.putDocument(
    {
      key: DOSSIERS_KEY,
      value: { schemaVersion: 2, items },
      expectedVersion,
    },
    scientificDossiersDocumentSchema,
  );
}

export function mergeDiscoveredWorks(
  current: ScientificWork[],
  discovered: ScientificWork[],
): { items: ScientificWork[]; duplicates: number; persisted: number } {
  const byDoi = new Map(current.map((item) => [item.doi, item]));
  let duplicates = 0;
  let persisted = 0;
  for (const item of discovered) {
    if (byDoi.has(item.doi)) {
      duplicates += 1;
      continue;
    }
    byDoi.set(item.doi, item);
    persisted += 1;
  }
  return {
    items: [...byDoi.values()].sort(
      (a, b) => b.score.total - a.score.total || b.publicationDate.localeCompare(a.publicationDate),
    ),
    duplicates,
    persisted,
  };
}
