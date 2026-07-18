import { mkdir, readFile, writeFile } from "node:fs/promises";

import { assertSanitizedSeed } from "./staging/contracts";

const OUTPUT_PATH = ".wrangler/staging-seed.sql";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function main(): Promise<void> {
  const seed = assertSanitizedSeed(
    JSON.parse(await readFile("newsroom/staging/seed.v1.json", "utf8")) as unknown,
  );
  const documents = [
    ["staging/sources", seed.sources],
    ["staging/items", seed.items],
    ["staging/clusters", seed.clusters],
    ["staging/decisions", seed.decisions],
    ["staging/inbox", seed.inbox],
    ["staging/runs", seed.runs],
    ["staging/reports", seed.reports],
  ] as const;
  const statements = documents.map(
    ([key, value]) =>
      `INSERT INTO newsroom_documents (key, value_json, version, updated_at) ` +
      `VALUES (${sqlString(key)}, ${sqlString(JSON.stringify(value))}, 1, ${sqlString(
        new Date(0).toISOString(),
      )}) ON CONFLICT(key) DO NOTHING;`,
  );
  await mkdir(".wrangler", { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    ["-- Seed sanitizado de staging. Gerado localmente; não versionar.", ...statements, ""].join(
      "\n",
    ),
    "utf8",
  );
  console.log(
    `Seed SQL sanitizado preparado com ${documents.length} documentos em ${OUTPUT_PATH}.`,
  );
}

main().catch((error) => {
  console.error(`[erro] ${error instanceof Error ? error.message : "Falha sanitizada."}`);
  process.exitCode = 1;
});
