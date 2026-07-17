import { mkdir, readFile, writeFile } from "node:fs/promises";

import { D1EmulatorStorageAdapter } from "./newsroom/storage/d1-emulator";
import {
  applyMigrationsToEmulator,
  backupAndRestoreEmulator,
  loadStagingSeed,
  provisionPlan,
  rollbackPlan,
  seedEmulator,
} from "./staging/operations";

const [command = "validate", ...args] = process.argv.slice(2);
const apply = args.includes("--apply");
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

async function materializeConfig(): Promise<void> {
  const databaseId = option("database-id")?.trim();
  if (!databaseId || databaseId.startsWith("__"))
    throw new Error("Informe o database ID real de staging somente no ambiente autorizado.");
  const template = await readFile("cloudflare/wrangler.staging.template.jsonc", "utf8");
  const body = template.replace("__STAGING_D1_DATABASE_ID__", databaseId);
  await mkdir(".wrangler", { recursive: true });
  await writeFile(".wrangler/staging.generated.json", body, "utf8");
  console.log("Configuração temporária criada em .wrangler/; nenhum ID foi versionado.");
}

async function main(): Promise<void> {
  if (command === "validate") {
    const seed = await loadStagingSeed();
    const manifest = await readFile("cloudflare/wrangler.staging.template.jsonc", "utf8");
    if (!manifest.includes("__STAGING_D1_DATABASE_ID__"))
      throw new Error("Template perdeu o placeholder explícito do D1.");
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "validate-only",
          environment: seed.environment,
          sources: seed.sources.length,
          externalMutation: false,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === "provision") {
    console.log("Plano somente instrucional; confirme cada comando fora desta execução:");
    provisionPlan().forEach((step, index) => console.log(`${index + 1}. ${step}`));
    return;
  }
  if (command === "rollback:plan") {
    console.log("Plano de rollback somente instrucional:");
    rollbackPlan().forEach((step, index) => console.log(`${index + 1}. ${step}`));
    return;
  }
  if (command === "config") return materializeConfig();
  const seed = await loadStagingSeed();
  const adapter = new D1EmulatorStorageAdapter();
  if (command === "migrate") {
    if (!apply) {
      console.log("Dry-run: migration 0001 pronta para o emulador; nenhuma escrita realizada.");
      return;
    }
    console.log(
      `Migrations aplicadas no emulador: ${(await applyMigrationsToEmulator(adapter)).join(", ")}.`,
    );
    return;
  }
  if (command === "seed") {
    if (!apply) {
      console.log(`Dry-run: seed sanitizado com ${seed.items.length} itens; nenhuma escrita.`);
      return;
    }
    await applyMigrationsToEmulator(adapter);
    console.log(
      `Seed aplicado somente no emulador: ${await seedEmulator(adapter, seed)} documentos.`,
    );
    return;
  }
  if (command === "recovery:test") {
    const result = await backupAndRestoreEmulator(seed);
    console.log(JSON.stringify({ ...result, target: "d1-emulator", remote: false }, null, 2));
    return;
  }
  throw new Error(`Comando de staging desconhecido: ${command}.`);
}

main().catch((error) => {
  console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
