import { z } from "zod";

import { loadCatalog } from "../catalog";
import { loadDecisions, loadPitches } from "../decision-store";
import { loadInbox } from "../review-inbox";
import { loadQueue } from "../queue";
import { loadQuarantine } from "../quarantine";
import { loadCircuits } from "../retry-circuit";
import { loadRuns } from "../run-store";
import { loadRuntime } from "../runtime";
import { loadClaims, loadClusters, loadEvidencePackages } from "../story-store";
import { loadTranslations } from "../translation";
import { sha256 } from "./sha256";
import { storageAdapter } from "./runtime";

export const snapshotSchema = z.object({
  version: z.literal(1),
  createdAt: z.iso.datetime(),
  manifest: z.array(
    z.object({
      key: z.string(),
      records: z.number().int().nonnegative(),
      checksum: z.string().length(64),
    }),
  ),
  documents: z.record(z.string(), z.unknown()),
  audit: z.array(z.unknown()),
  auditChecksum: z.string().length(64),
  objects: z.array(z.unknown()),
  objectsChecksum: z.string().length(64),
});
export type StorageSnapshot = z.infer<typeof snapshotSchema>;

export async function createSnapshot(now = new Date()): Promise<StorageSnapshot> {
  const adapter = storageAdapter();
  const [
    catalog,
    runtime,
    queue,
    quarantine,
    circuits,
    clusters,
    claims,
    evidence,
    translations,
    decisions,
    pitches,
    inbox,
    runs,
  ] = await Promise.all([
    loadCatalog(),
    loadRuntime(),
    loadQueue(),
    loadQuarantine(),
    loadCircuits(),
    loadClusters(),
    loadClaims(),
    loadEvidencePackages(),
    loadTranslations(),
    loadDecisions(),
    loadPitches(),
    loadInbox(),
    loadRuns(),
  ]);
  const entries = [
    ["sources/catalog", catalog],
    ["sources/runtime", runtime],
    ["queue", queue],
    ["quarantine", quarantine],
    ["document/sources/circuits", { version: 1, circuits }],
    ["document/clusters", { version: 1, generatedAt: now.toISOString(), clusters }],
    ["document/claims", { version: 1, claims }],
    ["document/evidence-packages", { version: 1, packages: evidence }],
    ["document/translations", { version: 1, entries: translations }],
    [
      "document/decisions/index",
      { version: 1, policyVersion: decisions[0]?.policyVersion ?? "none", decisions },
    ],
    ["document/pitches/index", { version: 1, pitches }],
    ["document/inbox/index", { version: 1, entries: inbox }],
    ["document/runs/index", { version: 1, runs }],
  ] as const;
  const documents = Object.fromEntries(entries);
  const manifest = await Promise.all(
    entries.map(async ([key, value]) => ({
      key,
      records: Array.isArray(value) ? value.length : 1,
      checksum: await sha256(JSON.stringify(value)),
    })),
  );
  const audit: unknown[] = [];
  let auditCursor: string | undefined;
  do {
    const page = await adapter.listAudit(100, auditCursor);
    audit.push(...page.items);
    auditCursor = page.cursor;
  } while (auditCursor);
  const objects: unknown[] = [];
  let objectCursor: string | undefined;
  do {
    const page = await adapter.listObjects("", 100, objectCursor);
    objects.push(...page.items);
    objectCursor = page.cursor;
  } while (objectCursor);
  return snapshotSchema.parse({
    version: 1,
    createdAt: now.toISOString(),
    manifest,
    documents,
    audit,
    auditChecksum: await sha256(JSON.stringify(audit)),
    objects,
    objectsChecksum: await sha256(JSON.stringify(objects)),
  });
}

export async function importSnapshot(snapshot: StorageSnapshot): Promise<{
  imported: number;
  conflicts: string[];
}> {
  const validated = snapshotSchema.parse(snapshot);
  if ((await sha256(JSON.stringify(validated.audit))) !== validated.auditChecksum)
    throw new Error("Checksum inválido: audit.");
  if ((await sha256(JSON.stringify(validated.objects))) !== validated.objectsChecksum)
    throw new Error("Checksum inválido: objects.");
  const conflicts: string[] = [];
  const writes = [];
  for (const entry of validated.manifest) {
    const value = validated.documents[entry.key];
    if ((await sha256(JSON.stringify(value))) !== entry.checksum)
      throw new Error(`Checksum inválido: ${entry.key}.`);
    const current = await storageAdapter().getDocument(entry.key, z.unknown(), undefined);
    if (current.version && JSON.stringify(current.value) !== JSON.stringify(value)) {
      conflicts.push(entry.key);
      continue;
    }
    if (!current.version) writes.push({ key: entry.key, value, expectedVersion: 0 });
  }
  if (conflicts.length) return { imported: 0, conflicts };
  const adapter = storageAdapter();
  const existingAudit = new Set((await adapter.listAudit(10_000)).items.map((event) => event.id));
  const existingObjects = new Map(
    (await adapter.listObjects("", 10_000)).items.map((object) => [object.key, object.hash]),
  );
  for (const object of validated.objects) {
    const parsed = z
      .object({
        key: z.string(),
        body: z.string(),
        contentType: z.string(),
        hash: z.string(),
        size: z.number(),
        createdAt: z.string(),
      })
      .parse(object);
    const currentHash = existingObjects.get(parsed.key);
    if (currentHash && currentHash !== parsed.hash) conflicts.push(`object:${parsed.key}`);
  }
  if (conflicts.length) return { imported: 0, conflicts };
  await adapter.transaction(writes);
  for (const event of validated.audit) {
    const parsed = z
      .object({
        id: z.string(),
        timestamp: z.string(),
        actor: z.string(),
        action: z.string(),
        entity: z.string(),
        entityId: z.string(),
        origin: z.string(),
        success: z.boolean(),
        version: z.number(),
      })
      .passthrough()
      .parse(event);
    if (!existingAudit.has(parsed.id)) await adapter.appendAudit(parsed);
  }
  for (const object of validated.objects) {
    const parsed = z
      .object({
        key: z.string(),
        body: z.string(),
        contentType: z.string(),
        hash: z.string(),
        size: z.number(),
        createdAt: z.string(),
      })
      .parse(object);
    if (!existingObjects.has(parsed.key)) await adapter.putObject(parsed);
  }
  return {
    imported: writes.length + validated.audit.length + validated.objects.length,
    conflicts: [],
  };
}
