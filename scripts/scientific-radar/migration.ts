import { copyFile, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { LocalFileStorageAdapter } from "../newsroom/storage/local-adapter";
import {
  scientificRadarDocumentSchema,
  scientificWorkSchema,
  type ScientificRadarDocument,
  type ScientificWork,
} from "./contracts";
import { detectScientificWarnings } from "./warnings";

export const RADAR_V1_PATH = resolve("newsroom/storage/scientific-radar/items.json");
export const RADAR_V1_BACKUP_PATH = resolve(
  "newsroom/storage/scientific-radar/items.v1.backup.json",
);

type LegacyDocument = { schemaVersion: 1; lastRunAt: string | null; items: unknown[] };

function isLegacyDocument(value: unknown): value is LegacyDocument {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).schemaVersion === 1 &&
    Array.isArray((value as Record<string, unknown>).items),
  );
}

export function migrateScientificRadarDocument(
  input: unknown,
  detectedAt: string,
): { value: ScientificRadarDocument; changed: boolean } {
  const current = scientificRadarDocumentSchema.safeParse(input);
  if (current.success) return { value: current.data, changed: false };
  if (!isLegacyDocument(input))
    throw new Error("Documento científico não está em versão migrável.");
  const items = input.items.map((candidate) => {
    if (!candidate || typeof candidate !== "object")
      throw new Error("Registro científico inválido.");
    const legacy = candidate as Record<string, unknown>;
    const peerReviewStatus =
      legacy.type === "journal-article" && legacy.journal
        ? ("probable" as const)
        : ("unknown" as const);
    const base = {
      ...legacy,
      countries: [],
      openAccessUrl: null,
      peerReviewStatus,
      corrected: false,
      retracted: false,
      warningVersion: 1 as const,
    };
    return scientificWorkSchema.parse({
      ...base,
      warnings: detectScientificWarnings(base as unknown as ScientificWork, detectedAt),
    });
  });
  return {
    changed: true,
    value: scientificRadarDocumentSchema.parse({
      schemaVersion: 2,
      lastRunAt: input.lastRunAt,
      items,
    }),
  };
}

export async function migrateLocalScientificRadar(options: {
  apply: boolean;
  now?: Date;
  adapter?: LocalFileStorageAdapter;
}) {
  const now = options.now ?? new Date();
  const rawEnvelope = JSON.parse(await readFile(RADAR_V1_PATH, "utf8")) as {
    storageVersion?: number;
    value?: unknown;
  };
  const before = rawEnvelope.value ?? rawEnvelope;
  const migrated = migrateScientificRadarDocument(before, now.toISOString());
  const beforeItems = isLegacyDocument(before)
    ? before.items
    : scientificRadarDocumentSchema.parse(before).items;
  const report = {
    mode: options.apply ? "apply" : "dry-run",
    changed: migrated.changed,
    beforeVersion: isLegacyDocument(before) ? 1 : 2,
    afterVersion: 2,
    beforeItems: beforeItems.length,
    afterItems: migrated.value.items.length,
    uniqueIds: new Set(migrated.value.items.map(({ id }) => id)).size,
    uniqueDois: new Set(migrated.value.items.map(({ doi }) => doi)).size,
    warnings: migrated.value.items.reduce((total, item) => total + item.warnings.length, 0),
  };
  if (!options.apply || !migrated.changed) return report;
  await copyFile(RADAR_V1_PATH, RADAR_V1_BACKUP_PATH);
  const adapter = options.adapter ?? new LocalFileStorageAdapter();
  const nextEnvelope = {
    storageVersion: (rawEnvelope.storageVersion ?? 0) + 1,
    updatedAt: now.toISOString(),
    value: migrated.value,
  };
  const temporary = `${RADAR_V1_PATH}.migration.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(nextEnvelope, null, 2)}\n`, "utf8");
    const verified = JSON.parse(await readFile(temporary, "utf8")) as { value: unknown };
    scientificRadarDocumentSchema.parse(verified.value);
    await rename(temporary, RADAR_V1_PATH);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
  await adapter.appendAudit({
    id: crypto.randomUUID(),
    timestamp: now.toISOString(),
    actor: "scientific-radar-migration",
    action: "scientific-radar:migrate-warnings-v2",
    entity: "scientific-radar",
    entityId: "items",
    reason: "Migração local idempotente para warnings estruturados.",
    origin: "local-supervised",
    success: true,
    version: 2,
    before: { schemaVersion: 1, items: beforeItems.length },
    after: { schemaVersion: 2, items: migrated.value.items.length, warnings: report.warnings },
  });
  return report;
}
