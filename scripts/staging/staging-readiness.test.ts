import { afterEach, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { getArticleBySlug, getPublishedArticles } from "../../src/content/repository";
import { getAuthor } from "../../src/data/authors";
import { resolveEnvironment } from "../../src/config/environment";
import { createSessionToken, revokeSession, verifySessionToken } from "../../src/lib/admin/auth";
import { executeAdminAction } from "../../src/lib/admin/actions";
import { handleAdminRequest } from "../../src/lib/admin/handler";
import { loginAllowed, recordFailedLogin } from "../../src/lib/admin/rate-limit";
import { D1EmulatorStorageAdapter } from "../newsroom/storage/d1-emulator";
import { StorageConflictError } from "../newsroom/storage/errors";
import { createStorageAdapter, setStorageAdapter } from "../newsroom/storage/runtime";
import { assertSanitizedSeed, validateStagingEnvironment } from "./contracts";
import {
  applyMigrationsToEmulator,
  backupAndRestoreEmulator,
  loadStagingSeed,
  rollbackPlan,
  seedEmulator,
} from "./operations";

const secret = "segredo-de-teste-nao-versionado-em-config";

afterEach(() => setStorageAdapter(undefined));

describe("Sprint 19 — staging e ensaio seguro", () => {
  test("1-2. staging não é produção e permanece noindex", () => {
    const config = resolveEnvironment({
      appEnvironment: "staging",
      publicSiteUrl: "https://staging.example.test",
    });
    expect(config.isOfficialProduction).toBe(false);
    expect(config.isStaging).toBe(true);
    expect(config.indexingEnabled).toBe(false);
  });

  test("3. staging recusa a origem de produção", () => {
    expect(() =>
      validateStagingEnvironment({
        appEnvironment: "staging",
        newsroomEnvironment: "staging",
        storageDriver: "d1",
        stagingBaseUrl: "https://same.example.test",
        productionBaseUrl: "https://same.example.test",
      }),
    ).toThrow("produção");
  });

  test("4-5. binding ausente falha e emulador funciona", async () => {
    expect(() =>
      createStorageAdapter({ NEWSROOM_ENVIRONMENT: "staging", NEWSROOM_STORAGE_DRIVER: "d1" }),
    ).toThrow("Binding");
    expect((await new D1EmulatorStorageAdapter().healthCheck()).ok).toBe(true);
  });

  test("6. migration emulada é idempotente", async () => {
    const adapter = new D1EmulatorStorageAdapter();
    expect(await applyMigrationsToEmulator(adapter)).toEqual([1]);
    expect(await applyMigrationsToEmulator(adapter)).toEqual([]);
  });

  test("7-8. seed é sanitizado e não contém segredo", async () => {
    const seed = await loadStagingSeed();
    expect(seed.sources.every(({ active }) => !active)).toBe(true);
    expect(JSON.stringify(seed).toLowerCase()).not.toContain("secret");
    expect(() => assertSanitizedSeed({ ...seed, secret: "proibido" })).toThrow();
  });

  test("9. sessão sobrevive a nova instância do emulador", async () => {
    const first = new D1EmulatorStorageAdapter();
    setStorageAdapter(first);
    const created = await createSessionToken(secret, "editor-staging");
    setStorageAdapter(first.fork());
    expect(await verifySessionToken(created.token, secret)).toBeDefined();
  });

  test("10. logout revoga a sessão durável", async () => {
    const adapter = new D1EmulatorStorageAdapter();
    setStorageAdapter(adapter);
    const created = await createSessionToken(secret, "editor-staging");
    await revokeSession(created.session);
    setStorageAdapter(adapter.fork());
    expect(await verifySessionToken(created.token, secret)).toBeUndefined();
  });

  test("11. rate limit persiste entre instâncias", async () => {
    const adapter = new D1EmulatorStorageAdapter();
    setStorageAdapter(adapter);
    for (let index = 0; index < 5; index += 1) await recordFailedLogin("durable-key", index);
    setStorageAdapter(adapter.fork());
    expect(await loginAllowed("durable-key", 10)).toBe(false);
  });

  test("12-13. lock bloqueia concorrência e owner antigo", async () => {
    const first = new D1EmulatorStorageAdapter();
    const second = first.fork();
    const old = new Date("2026-07-17T00:00:00Z");
    await first.acquireLock({
      key: "global",
      owner: "old",
      runId: "run-old",
      acquiredAt: old.toISOString(),
      heartbeatAt: old.toISOString(),
      expiresAt: new Date(old.valueOf() + 60_000).toISOString(),
    });
    await expect(
      second.acquireLock({
        key: "global",
        owner: "new",
        runId: "run-new",
        acquiredAt: old.toISOString(),
        heartbeatAt: old.toISOString(),
        expiresAt: new Date(old.valueOf() + 60_000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(StorageConflictError);
    await expect(second.renewLock("global", "invalid-owner", old.toISOString())).rejects.toThrow();
  });

  test("14-16. backup/restore preserva IDs e rejeita seed inválido", async () => {
    const seed = await loadStagingSeed();
    const result = await backupAndRestoreEmulator(seed);
    expect(result.checksum).toHaveLength(64);
    expect(result.records).toBe(7);
    expect(() => assertSanitizedSeed({ ...seed, environment: "production" })).toThrow();
  });

  test("17. smoke não imprime nem interpola segredo", async () => {
    const source = await readFile("scripts/staging-smoke.ts", "utf8");
    expect(source).not.toContain("console.log(options.adminSecret");
    expect(source).not.toContain("console.log(process.env.STAGING_ADMIN_SECRET");
    expect(source).toContain("artigo demo rotulado");
  });

  test("18-19. admin bloqueia anônimo e funciona autenticado", async () => {
    const adapter = new D1EmulatorStorageAdapter();
    setStorageAdapter(adapter);
    const blocked = await handleAdminRequest(new Request("http://localhost/api/admin/dashboard"), {
      NEWSROOM_ADMIN_SECRET: secret,
    });
    expect(blocked?.status).toBe(401);
    const created = await createSessionToken(secret, "editor-staging");
    const allowed = await handleAdminRequest(
      new Request("http://localhost/api/admin/storage/health", {
        headers: { cookie: `newsroom_admin=${created.token}` },
      }),
      { NEWSROOM_ADMIN_SECRET: secret, NEWSROOM_ENVIRONMENT: "staging" },
    );
    expect(allowed?.status).toBe(200);
  });

  test("20-25. guardrails editoriais permanecem", async () => {
    await expect(
      executeAdminAction({ action: "pipeline:apply", actor: "editor", note: "", values: {} }),
    ).rejects.toThrow("Apply completo");
    const manifest = await readFile("cloudflare/wrangler.staging.template.jsonc", "utf8");
    expect(manifest).toContain('"VITE_APP_ENV": "staging"');
    expect(manifest).toContain('"VITE_ALLOW_DEMO_CONTENT": "true"');
    expect(manifest).toContain('"NEWSROOM_SCHEDULE_ENABLED": "false"');
    expect(getPublishedArticles().map(({ slug }) => slug)).toEqual([
      "por-que-o-hidrogenio-verde-nao-vai-substituir-toda-a-eletricidade",
      "a-rede-eletrica-esta-preparada-para-a-transicao-energetica",
      "por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao",
      "a-transicao-energetica-vai-ficar-sem-cobre",
      "geotermia-de-nova-geracao",
      "o-que-acontece-com-um-painel-solar-no-fim-da-vida",
      "perovskita-silicio-por-que-empilhar-duas-celulas-solares",
      "temos-energia-por-que-nao-conseguimos-conecta-la-a-rede",
      "uma-bateria-precisa-mesmo-ser-pequena",
      "baterias-de-sodio-estao-chegando",
      "fusao-nuclear-esta-mais-perto-mas-perto-de-que",
      "o-que-e-potencia",
      "por-que-armazenar-energia-e-tao-dificil",
      "por-que-nenhuma-maquina-e-100-eficiente",
      "o-que-e-energia",
    ]);
    expect(
      await getArticleBySlug("rascunho-como-funciona-matriz-eletrica-brasileira"),
    ).toBeUndefined();
    expect(getAuthor("olavo-oliveira")?.status).toBe("verified");
    expect(await readFile("src/routes/index.tsx", "utf8")).not.toContain("newsroom/");
  });

  test("26-27. workflow não implanta produção nem cria commit", async () => {
    const workflow = await readFile(".github/workflows/staging-readiness.yml", "utf8");
    expect(workflow).not.toMatch(/wrangler deploy.+production/i);
    expect(workflow).not.toMatch(/\bgit (?:commit|push|merge)\b/);
    expect(workflow).not.toContain("push:");
  });

  test("28. rollback começa pelo kill switch", () => {
    expect(rollbackPlan()[0]).toContain("NEWSROOM_ENABLED");
  });

  test("29-30. ambiente desconhecido e mistura com produção falham", () => {
    expect(() =>
      createStorageAdapter({
        NEWSROOM_ENVIRONMENT: "unknown",
        NEWSROOM_STORAGE_DRIVER: "local",
      }),
    ).toThrow("desconhecido");
    expect(() =>
      validateStagingEnvironment({
        appEnvironment: "production",
        newsroomEnvironment: "staging",
        storageDriver: "d1",
        stagingBaseUrl: "https://staging.example.test",
      }),
    ).toThrow();
  });

  test("comandos oficiais de check e smoke local permanecem seguros", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts["staging:check"]).toBe("bun run staging:validate");
    expect(packageJson.scripts["staging:smoke:local"]).toBe("bun run smoke");
  });

  test("seed pode ser aplicado somente no emulador", async () => {
    const adapter = new D1EmulatorStorageAdapter();
    expect(await seedEmulator(adapter, await loadStagingSeed())).toBe(7);
  });
});
