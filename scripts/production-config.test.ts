import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import {
  MINIMUM_COMPATIBILITY_DATE,
  PRODUCTION_CONFIG_PATH,
  PRODUCTION_D1_BINDING,
  PRODUCTION_D1_PLACEHOLDER,
  PRODUCTION_DATABASE,
  PRODUCTION_TEMPLATE_PATH,
  PRODUCTION_WORKER,
  assertProductionConfig,
  compareWithActiveWorker,
  productionDryRunArguments,
  renderProductionConfig,
  validateDatabaseId,
} from "./production-config";

const testDatabaseId = "11111111-1111-4111-8111-111111111111";

async function configuredTemplate() {
  const template = await readFile(PRODUCTION_TEMPLATE_PATH, "utf8");
  return JSON.parse(renderProductionConfig(template, testDatabaseId));
}

function activeWorker(databaseId = testDatabaseId) {
  return {
    resources: {
      script_runtime: {
        compatibility_date: MINIMUM_COMPATIBILITY_DATE,
        compatibility_flags: ["nodejs_compat"],
      },
      bindings: [
        { name: "ASSETS", type: "assets" },
        { name: "NEWSROOM_DB", type: "d1", database_id: databaseId },
        { name: "REMOTE_SECRET", type: "secret_text" },
      ],
    },
  };
}

describe("configuração oficial de produção", () => {
  test("template versionado contém somente o placeholder protegido", async () => {
    const template = await readFile(PRODUCTION_TEMPLATE_PATH, "utf8");
    expect(template).toContain(`"database_id": "${PRODUCTION_D1_PLACEHOLDER}"`);
    expect(template).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
  });

  test("template fixa Worker, runtime, assets e D1 aprovados", async () => {
    const config = await configuredTemplate();
    expect(config.name).toBe(PRODUCTION_WORKER);
    expect(config.compatibility_date).toBe(MINIMUM_COMPATIBILITY_DATE);
    expect(config.compatibility_flags).toContain("nodejs_compat");
    expect(config.assets).toEqual({ binding: "ASSETS", directory: "../.output/public" });
    expect(config.d1_databases[0]).toMatchObject({
      binding: PRODUCTION_D1_BINDING,
      database_name: PRODUCTION_DATABASE,
      database_id: testDatabaseId,
    });
  });

  test("rejeita ID vazio, placeholder e formato inválido", () => {
    expect(() => validateDatabaseId("")).toThrow();
    expect(() => validateDatabaseId(PRODUCTION_D1_PLACEHOLDER)).toThrow();
    expect(() => validateDatabaseId("database-id")).toThrow();
  });

  test("rejeita Worker de staging", async () => {
    const config = await configuredTemplate();
    config.name = "sul-global-staging";
    expect(() => assertProductionConfig(config)).toThrow();
  });

  test("rejeita compatibility_date antiga", async () => {
    const config = await configuredTemplate();
    config.compatibility_date = "2026-07-14";
    expect(() => assertProductionConfig(config)).toThrow();
  });

  test("rejeita ausência de nodejs_compat, ASSETS e NEWSROOM_DB", async () => {
    const config = await configuredTemplate();
    expect(() => assertProductionConfig({ ...config, compatibility_flags: [] })).toThrow();
    expect(() => assertProductionConfig({ ...config, assets: undefined })).toThrow();
    expect(() => assertProductionConfig({ ...config, d1_databases: [] })).toThrow();
  });

  test("rejeita D1 incorreto e configuração automática do Nitro", async () => {
    const config = await configuredTemplate();
    const wrongD1 = structuredClone(config);
    wrongD1.d1_databases[0].database_name = "sul-global-newsroom-staging";
    expect(() => assertProductionConfig(wrongD1)).toThrow();
    expect(() => assertProductionConfig({ ...config, main: ".output/server/index.mjs" })).toThrow();
  });

  test("impede downgrade em relação à versão ativa e troca silenciosa do D1", async () => {
    const config = await configuredTemplate();
    expect(() =>
      compareWithActiveWorker(config, {
        ...activeWorker(),
        resources: {
          ...activeWorker().resources,
          script_runtime: {
            compatibility_date: "2026-10-01",
            compatibility_flags: ["nodejs_compat"],
          },
        },
      }),
    ).toThrow();
    expect(() =>
      compareWithActiveWorker(config, activeWorker("22222222-2222-4222-8222-222222222222")),
    ).toThrow();
  });

  test("dry-run oficial usa somente config gerada e preserva variáveis remotas", () => {
    expect(productionDryRunArguments()).toEqual([
      "--config",
      PRODUCTION_CONFIG_PATH,
      "--keep-vars",
      "--dry-run",
    ]);
  });

  test("arquivo gerado permanece ignorado pelo Git", async () => {
    const child = Bun.spawn(["git", "check-ignore", "--quiet", PRODUCTION_CONFIG_PATH]);
    expect(await child.exited).toBe(0);
  });
});
