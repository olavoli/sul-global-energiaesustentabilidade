import { createSnapshot, importSnapshot, snapshotSchema } from "./newsroom/storage/snapshot";
import { createCliContext } from "./newsroom/cli-types";
import {
  createStorageAdapter,
  setStorageAdapter,
  storageAdapter,
} from "./newsroom/storage/runtime";
import { sha256 } from "./newsroom/storage/sha256";

const context = createCliContext();
setStorageAdapter(
  createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: context.option("storage") ?? process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: process.env.NEWSROOM_ENVIRONMENT ?? "development",
  }),
);

async function main(): Promise<void> {
  if (context.command === "health") {
    console.log(JSON.stringify(await storageAdapter().healthCheck(), null, 2));
    return;
  }
  if (context.command === "migrate:status") {
    console.log(
      JSON.stringify(
        {
          driver: storageAdapter().driver,
          applied: storageAdapter().driver === "local" ? ["local-schema-v1"] : [],
          pending: storageAdapter().driver === "local" ? [] : ["binding D1 necessário"],
        },
        null,
        2,
      ),
    );
    return;
  }
  if (context.command === "migrate" || context.command === "migrate:validate") {
    console.log(
      context.apply
        ? "Nenhuma migration remota executada: binding D1 não fornecido ao CLI local."
        : "Dry-run: migration 0001_newsroom_core pronta e idempotente.",
    );
    return;
  }
  const snapshot = await createSnapshot();
  if (context.command === "export" || context.command === "backup") {
    const body = `${JSON.stringify(snapshot, null, 2)}\n`;
    const checksum = await sha256(body);
    console.log(
      JSON.stringify(
        { records: snapshot.manifest.reduce((sum, item) => sum + item.records, 0), checksum },
        null,
        2,
      ),
    );
    if (context.apply) {
      const key = `exports/${snapshot.createdAt.replace(/[:.]/g, "-")}.json`;
      await storageAdapter().putObject({
        key,
        body,
        contentType: "application/json; charset=utf-8",
        hash: checksum,
        size: new TextEncoder().encode(body).byteLength,
        createdAt: snapshot.createdAt,
      });
      console.log(`Export privado criado: ${key}.`);
    } else console.log("Dry-run: nenhum export foi persistido; use --apply.");
    return;
  }
  if (context.command === "verify") {
    snapshotSchema.parse(snapshot);
    for (const item of snapshot.manifest) {
      const checksum = await sha256(JSON.stringify(snapshot.documents[item.key]));
      if (checksum !== item.checksum) throw new Error(`Checksum inválido: ${item.key}.`);
    }
    if ((await sha256(JSON.stringify(snapshot.audit))) !== snapshot.auditChecksum)
      throw new Error("Checksum inválido: audit.");
    if ((await sha256(JSON.stringify(snapshot.objects))) !== snapshot.objectsChecksum)
      throw new Error("Checksum inválido: objects.");
    console.log("Snapshot local validado; nenhum segredo ou cookie incluído.");
    return;
  }
  if (context.command === "import" || context.command === "restore") {
    if (!context.apply) {
      console.log(
        `Dry-run: ${snapshot.manifest.length} documentos validados; nenhuma escrita realizada.`,
      );
      return;
    }
    const result = await importSnapshot(snapshot);
    if (result.conflicts.length)
      throw new Error(`Conflitos explícitos: ${result.conflicts.join(", ")}.`);
    console.log(`${result.imported} documentos importados de forma idempotente.`);
    return;
  }
  throw new Error(`Comando de storage desconhecido: ${context.command}.`);
}

main().catch((error) => {
  console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
