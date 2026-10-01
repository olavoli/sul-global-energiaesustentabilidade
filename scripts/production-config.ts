import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const PRODUCTION_WORKER = "sul-global-production";
export const PRODUCTION_DATABASE = "sul-global-newsroom-production";
export const PRODUCTION_D1_BINDING = "NEWSROOM_DB";
export const PRODUCTION_ASSETS_BINDING = "ASSETS";
export const MINIMUM_COMPATIBILITY_DATE = "2026-09-24";
export const PRODUCTION_TEMPLATE_PATH = "cloudflare/wrangler.production.template.jsonc";
export const PRODUCTION_CONFIG_PATH = ".wrangler/production.generated.json";
export const PRODUCTION_D1_PLACEHOLDER = "__PRODUCTION_D1_DATABASE_ID__";

type ProductionConfig = {
  name?: string;
  main?: string;
  compatibility_date?: string;
  compatibility_flags?: string[];
  no_bundle?: boolean;
  assets?: { binding?: string; directory?: string };
  d1_databases?: Array<{
    binding?: string;
    database_name?: string;
    database_id?: string;
    migrations_dir?: string;
  }>;
  vars?: Record<string, string>;
};

type RemoteBinding = {
  name?: string;
  type?: string;
  id?: string;
  database_id?: string;
};

type RemoteVersion = {
  resources?: {
    script_runtime?: { compatibility_date?: string; compatibility_flags?: string[] };
    bindings?: RemoteBinding[];
  };
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message: string): never {
  throw new Error(`[production] ${message}`);
}

export function validateDatabaseId(databaseId: string | undefined): string {
  const value = databaseId?.trim();
  if (!value) fail("PRODUCTION_D1_DATABASE_ID não foi definida.");
  if (
    value.includes("PLACEHOLDER") ||
    value.startsWith("__") ||
    value === PRODUCTION_D1_PLACEHOLDER
  )
    fail("PRODUCTION_D1_DATABASE_ID ainda contém um placeholder.");
  if (!uuidPattern.test(value)) fail("PRODUCTION_D1_DATABASE_ID não possui formato UUID válido.");
  return value;
}

export function assertProductionConfig(config: ProductionConfig): void {
  if (config.name !== PRODUCTION_WORKER) fail(`Worker deve ser ${PRODUCTION_WORKER}.`);
  if (config.name.includes("staging")) fail("Configuração de staging recusada.");
  if (config.main !== "../.output/server/index.mjs")
    fail(
      "Entrypoint deve apontar para o build isolado, não para a configuração automática do Nitro.",
    );
  if (!config.compatibility_date || config.compatibility_date < MINIMUM_COMPATIBILITY_DATE)
    fail(`compatibility_date não pode ser anterior a ${MINIMUM_COMPATIBILITY_DATE}.`);
  if (!config.compatibility_flags?.includes("nodejs_compat")) fail("nodejs_compat é obrigatório.");
  if (config.no_bundle !== true)
    fail("no_bundle deve permanecer habilitado para o artefato Nitro.");
  if (
    config.assets?.binding !== PRODUCTION_ASSETS_BINDING ||
    config.assets.directory !== "../.output/public"
  )
    fail("Binding ASSETS ou diretório público divergente.");

  const database = config.d1_databases?.find(({ binding }) => binding === PRODUCTION_D1_BINDING);
  if (!database) fail("Binding NEWSROOM_DB ausente.");
  if (database.database_name !== PRODUCTION_DATABASE) fail(`D1 deve ser ${PRODUCTION_DATABASE}.`);
  validateDatabaseId(database.database_id);
  if (database.migrations_dir !== "../scripts/newsroom/storage")
    fail("Diretório de migrations D1 divergente.");

  const serialized = JSON.stringify(config).toLowerCase();
  if (serialized.includes("sul-global-staging") || serialized.includes("workers.dev"))
    fail("Referência de staging encontrada na configuração de produção.");
  if (
    config.vars?.VITE_APP_ENV !== "production" ||
    config.vars?.VITE_PUBLIC_SITE_URL !== "https://sulglobalenergia.com.br" ||
    config.vars?.VITE_ALLOW_DEMO_CONTENT !== "false" ||
    config.vars?.NEWSROOM_ENVIRONMENT !== "production" ||
    config.vars?.NEWSROOM_STORAGE_DRIVER !== "d1"
  )
    fail("Variáveis estruturais de produção divergentes.");
}

export function renderProductionConfig(template: string, databaseId: string): string {
  const validatedId = validateDatabaseId(databaseId);
  const occurrences = template.split(PRODUCTION_D1_PLACEHOLDER).length - 1;
  if (occurrences !== 1) fail("O template deve conter exatamente um placeholder de database_id.");
  const body = template.replace(PRODUCTION_D1_PLACEHOLDER, validatedId);
  const config = JSON.parse(body.replace(/,\s*([}\]])/g, "$1")) as ProductionConfig;
  assertProductionConfig(config);
  return `${JSON.stringify(config, null, 2)}\n`;
}

export function compareWithActiveWorker(config: ProductionConfig, remote: RemoteVersion): void {
  assertProductionConfig(config);
  const runtime = remote.resources?.script_runtime;
  if (!runtime?.compatibility_date) fail("Versão ativa não informou compatibility_date.");
  if (runtime.compatibility_date < MINIMUM_COMPATIBILITY_DATE)
    fail("Versão ativa possui compatibility_date abaixo do mínimo aprovado.");
  if (config.compatibility_date! < runtime.compatibility_date)
    fail("Configuração local rebaixaria a compatibility_date da versão ativa.");
  if (!runtime.compatibility_flags?.includes("nodejs_compat"))
    fail("Versão ativa não possui nodejs_compat; revisão humana obrigatória.");

  const bindings = remote.resources?.bindings ?? [];
  const remoteAssets = bindings.find(({ name }) => name === PRODUCTION_ASSETS_BINDING);
  if (remoteAssets?.type !== "assets") fail("Binding ASSETS ativo ausente ou divergente.");
  const remoteD1 = bindings.find(({ name }) => name === PRODUCTION_D1_BINDING);
  if (remoteD1?.type !== "d1") fail("Binding NEWSROOM_DB ativo ausente ou divergente.");
  const localD1 = config.d1_databases?.find(({ binding }) => binding === PRODUCTION_D1_BINDING);
  const remoteDatabaseId = remoteD1.database_id ?? remoteD1.id;
  if (!remoteDatabaseId) fail("Versão ativa não informou o identificador do D1.");
  if (remoteDatabaseId !== localD1?.database_id)
    fail("O D1 materializado diverge do binding NEWSROOM_DB ativo.");
}

async function parseConfig(): Promise<ProductionConfig> {
  const body = await readFile(PRODUCTION_CONFIG_PATH, "utf8");
  const config = JSON.parse(body) as ProductionConfig;
  assertProductionConfig(config);
  return config;
}

async function runJson(command: string[]): Promise<unknown> {
  const child = Bun.spawn(command, { stdout: "pipe", stderr: "pipe", env: process.env });
  const [stdout, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  if (exitCode !== 0) fail("Consulta remota somente leitura ao Wrangler falhou.");
  try {
    return JSON.parse(stdout);
  } catch {
    fail("Wrangler retornou uma resposta remota inválida.");
  }
}

async function getActiveVersion(): Promise<RemoteVersion> {
  const deployments = (await runJson([
    "bunx",
    "wrangler",
    "deployments",
    "list",
    "--name",
    PRODUCTION_WORKER,
    "--json",
  ])) as Array<{
    created_on?: string;
    versions?: Array<{ version_id?: string; percentage?: number }>;
  }>;
  const latest = [...deployments].sort((a, b) =>
    String(b.created_on).localeCompare(String(a.created_on)),
  )[0];
  const active = [...(latest?.versions ?? [])].sort(
    (a, b) => (b.percentage ?? 0) - (a.percentage ?? 0),
  )[0];
  if (!active?.version_id || active.percentage !== 100)
    fail("Implantação ativa ambígua; revisão humana obrigatória.");
  return (await runJson([
    "bunx",
    "wrangler",
    "versions",
    "view",
    active.version_id,
    "--name",
    PRODUCTION_WORKER,
    "--json",
  ])) as RemoteVersion;
}

async function assertGeneratedConfigIsIgnored(): Promise<void> {
  const child = Bun.spawn(["git", "check-ignore", "--quiet", PRODUCTION_CONFIG_PATH]);
  if ((await child.exited) !== 0)
    fail(`${PRODUCTION_CONFIG_PATH} deve permanecer ignorado pelo Git.`);
}

async function generate(): Promise<void> {
  const template = await readFile(PRODUCTION_TEMPLATE_PATH, "utf8");
  const body = renderProductionConfig(template, process.env.PRODUCTION_D1_DATABASE_ID ?? "");
  await mkdir(dirname(PRODUCTION_CONFIG_PATH), { recursive: true });
  await writeFile(PRODUCTION_CONFIG_PATH, body, "utf8");
  await assertGeneratedConfigIsIgnored();
  console.log(
    `[production] Configuração materializada em ${PRODUCTION_CONFIG_PATH}; ID protegido não exibido.`,
  );
}

async function check(): Promise<ProductionConfig> {
  await assertGeneratedConfigIsIgnored();
  const config = await parseConfig();
  compareWithActiveWorker(config, await getActiveVersion());
  console.log(
    `[production] Configuração validada: ${PRODUCTION_WORKER}, ${config.compatibility_date}, ASSETS e NEWSROOM_DB preservados.`,
  );
  return config;
}

function redact(output: string, databaseId: string): string {
  return output.split(databaseId).join("[D1_ID_PROTEGIDO]");
}

async function dryRun(): Promise<void> {
  const config = await check();
  await stat(".output/server/index.mjs");
  await stat(".output/public");
  const databaseId = config.d1_databases?.find(({ binding }) => binding === PRODUCTION_D1_BINDING)
    ?.database_id as string;
  const command = [
    "bunx",
    "wrangler",
    "deploy",
    "--config",
    PRODUCTION_CONFIG_PATH,
    "--keep-vars",
    "--dry-run",
    "--outdir",
    ".wrangler/production-dry-run",
  ];
  const child = Bun.spawn(command, { stdout: "pipe", stderr: "pipe", env: process.env });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  process.stdout.write(redact(stdout, databaseId));
  process.stderr.write(redact(stderr, databaseId));
  if (exitCode !== 0) fail("Dry-run do Wrangler falhou; nenhum deploy foi executado.");
  console.log("[production] Dry-run concluído com --keep-vars; nenhum deploy foi executado.");
}

export function productionDryRunArguments(): string[] {
  return ["--config", PRODUCTION_CONFIG_PATH, "--keep-vars", "--dry-run"];
}

if (import.meta.main) {
  const command = process.argv[2];
  if (command === "config") await generate();
  else if (command === "check") await check();
  else if (command === "dry-run") await dryRun();
  else fail("Use config, check ou dry-run.");
}
