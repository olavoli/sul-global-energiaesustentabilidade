import { readFile } from "node:fs/promises";
import { z } from "zod";

import { D1EmulatorStorageAdapter } from "../newsroom/storage/d1-emulator";
import type { StorageAdapter } from "../newsroom/storage/contracts";
import { sha256 } from "../newsroom/storage/sha256";
import { storageMigrations, validateMigrations } from "../newsroom/storage/migrations";
import { assertSanitizedSeed, type StagingSeed } from "./contracts";

const migrationStateSchema = z.object({
  applied: z.array(z.number().int().positive()),
});

export async function loadStagingSeed(): Promise<StagingSeed> {
  return assertSanitizedSeed(
    JSON.parse(await readFile("newsroom/staging/seed.v1.json", "utf8")) as unknown,
  );
}

export async function applyMigrationsToEmulator(adapter: StorageAdapter): Promise<number[]> {
  validateMigrations(storageMigrations);
  const state = await adapter.getDocument("system/migrations", migrationStateSchema, {
    applied: [],
  });
  const pending = storageMigrations.filter(({ version }) => !state.value.applied.includes(version));
  if (pending.length) {
    await adapter.putDocument(
      {
        key: "system/migrations",
        value: { applied: [...state.value.applied, ...pending.map(({ version }) => version)] },
        expectedVersion: state.version,
      },
      migrationStateSchema,
    );
  }
  return pending.map(({ version }) => version);
}

export async function seedEmulator(adapter: StorageAdapter, seed: StagingSeed): Promise<number> {
  const entries = [
    ["staging/sources", seed.sources],
    ["staging/items", seed.items],
    ["staging/clusters", seed.clusters],
    ["staging/decisions", seed.decisions],
    ["staging/inbox", seed.inbox],
    ["staging/runs", seed.runs],
    ["staging/reports", seed.reports],
  ] as const;
  await adapter.transaction(entries.map(([key, value]) => ({ key, value, expectedVersion: 0 })));
  return entries.length;
}

export async function backupAndRestoreEmulator(seed: StagingSeed): Promise<{
  checksum: string;
  records: number;
}> {
  const source = new D1EmulatorStorageAdapter();
  await applyMigrationsToEmulator(source);
  await seedEmulator(source, seed);
  const documents = (await source.listDocuments("staging/", 100)).items;
  const payload = documents.map(({ key, value }) => ({ key, value }));
  const body = JSON.stringify(payload);
  const checksum = await sha256(body);
  const target = new D1EmulatorStorageAdapter();
  await applyMigrationsToEmulator(target);
  await target.transaction(payload.map(({ key, value }) => ({ key, value, expectedVersion: 0 })));
  const restored = await target.listDocuments("staging/", 100);
  const restoredPayload = restored.items.map(({ key, value }) => ({ key, value }));
  if ((await sha256(JSON.stringify(restoredPayload))) !== checksum)
    throw new Error("Restore emulado divergiu do backup.");
  return { checksum, records: restored.items.length };
}

export function provisionPlan(): string[] {
  return [
    "npx wrangler d1 create sul-global-newsroom-staging",
    "Registrar o database_id retornado fora do Git.",
    "bun run staging:config -- --database-id <ID_DE_STAGING>",
    "npx wrangler secret put NEWSROOM_ADMIN_SECRET --config .wrangler/staging.generated.json",
    "npx wrangler d1 migrations list sul-global-newsroom-staging --remote",
    "npx wrangler d1 migrations apply sul-global-newsroom-staging --remote",
    "npx wrangler deploy --config .wrangler/staging.generated.json",
  ];
}

export function rollbackPlan(): string[] {
  return [
    "Desativar NEWSROOM_ENABLED como primeiro mecanismo de contenção.",
    "Bloquear a Central removendo/rotacionando NEWSROOM_ADMIN_SECRET.",
    "Retornar a newsroom ao modo somente leitura.",
    "Reimplantar a versão anterior aprovada do worker de staging.",
    "Restaurar backup somente em D1 isolado e após validação de checksums.",
    "Remover o binding somente após preservar evidências e confirmar o portal público.",
  ];
}
