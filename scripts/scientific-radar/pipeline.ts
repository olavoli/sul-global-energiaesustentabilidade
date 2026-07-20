import type { StorageAdapter } from "../newsroom/storage/contracts";
import {
  type RadarDiscoveryOptions,
  type RadarDiscoveryReport,
  type ScientificWork,
} from "./contracts";
import { normalizeScientificWork } from "./normalize";
import { queryOpenAlex, validateCrossrefDoi, normalizeDoi } from "./sources";
import { loadScientificRadar, mergeDiscoveredWorks, saveScientificRadar } from "./store";

export async function discoverScientificWorks(
  options: RadarDiscoveryOptions,
  adapter?: StorageAdapter,
): Promise<RadarDiscoveryReport> {
  const now = options.now ?? new Date();
  const openAlexWorks = await queryOpenAlex(
    {
      apiKey: options.apiKey,
      fromDate: options.fromDate,
      perPage: options.perPage ?? 25,
    },
    { fetcher: options.fetcher },
  );
  const normalized: ScientificWork[] = [];
  let doiCandidates = 0;
  let crossrefValidated = 0;
  for (const work of openAlexWorks) {
    if (!work.doi) continue;
    doiCandidates += 1;
    try {
      const doi = normalizeDoi(work.doi);
      const crossref = await validateCrossrefDoi(doi, options.crossrefMailto, {
        fetcher: options.fetcher,
      });
      if (!crossref) continue;
      crossrefValidated += 1;
      const item = await normalizeScientificWork(work, crossref, now);
      if (item) normalized.push(item);
    } catch {
      // A single malformed upstream record is rejected without aborting the bounded batch.
    }
  }
  const unique = [...new Map(normalized.map((item) => [item.doi, item])).values()];
  const current = await loadScientificRadar(adapter);
  const merged = mergeDiscoveredWorks(current.value.items, unique);
  await saveScientificRadar(
    { schemaVersion: 1, lastRunAt: now.toISOString(), items: merged.items },
    current.version,
    adapter,
  );
  return {
    fetched: openAlexWorks.length,
    doiCandidates,
    crossrefValidated,
    duplicates: merged.duplicates + normalized.length - unique.length,
    persisted: merged.persisted,
    rejected: doiCandidates - normalized.length,
    items: unique,
  };
}
