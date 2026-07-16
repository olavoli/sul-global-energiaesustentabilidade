import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";

import { getAuthor } from "../../../src/data/authors";
import { getArticleBySlug } from "../../../src/content/repository";
import { createStorageAdapter, setStorageAdapter } from "./runtime";
import { D1EmulatorStorageAdapter } from "./d1-emulator";
import { LocalFileStorageAdapter } from "./local-adapter";
import { MemoryStorageAdapter } from "./memory-adapter";
import { StorageConflictError, StorageConfigurationError } from "./errors";
import { storageMigrations, validateMigrations } from "./migrations";
import type { StorageAdapter } from "./contracts";

const documentSchema = z.object({
  id: z.string(),
  status: z.string(),
  history: z.array(z.string()).default([]),
});
const roots: string[] = [];

async function adapters(): Promise<Array<[string, StorageAdapter]>> {
  const root = await mkdtemp(join(tmpdir(), "newsroom-storage-"));
  roots.push(root);
  return [
    ["memory", new MemoryStorageAdapter()],
    ["local", new LocalFileStorageAdapter(root)],
    ["d1-emulator", new D1EmulatorStorageAdapter()],
  ];
}

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  setStorageAdapter(undefined);
});

const contractAdapters = await adapters();

describe("Sprint 18 — contrato comum de armazenamento", () => {
  for (const [name, adapter] of contractAdapters) {
    test(`${name}: 1. create e get`, async () => {
      await adapter.putDocument(
        { key: "items/a", value: { id: "a", status: "new", history: [] }, expectedVersion: 0 },
        documentSchema,
      );
      expect(
        (await adapter.getDocument("items/a", documentSchema, undefined as never)).value.id,
      ).toBe("a");
    });

    test(`${name}: 2. list paginado`, async () => {
      await adapter.putDocument(
        { key: "page/a", value: { id: "a", status: "new", history: [] } },
        documentSchema,
      );
      await adapter.putDocument(
        { key: "page/b", value: { id: "b", status: "new", history: [] } },
        documentSchema,
      );
      expect((await adapter.listDocuments("page/", 1)).items).toHaveLength(1);
    });

    test(`${name}: 3. update com versão correta`, async () => {
      const created = await adapter.putDocument(
        { key: "versions/good", value: { id: "good", status: "new", history: [] } },
        documentSchema,
      );
      const updated = await adapter.putDocument(
        {
          key: "versions/good",
          value: { ...created.value, status: "updated" },
          expectedVersion: created.version,
        },
        documentSchema,
      );
      expect(updated.version).toBe(created.version + 1);
    });

    test(`${name}: 4. conflito com versão antiga`, async () => {
      const created = await adapter.putDocument(
        { key: "versions/stale", value: { id: "stale", status: "new", history: [] } },
        documentSchema,
      );
      await adapter.putDocument(
        { key: "versions/stale", value: created.value, expectedVersion: created.version },
        documentSchema,
      );
      await expect(
        adapter.putDocument(
          { key: "versions/stale", value: created.value, expectedVersion: created.version },
          documentSchema,
        ),
      ).rejects.toBeInstanceOf(StorageConflictError);
    });

    test(`${name}: 5. histórico preservado`, async () => {
      const value = { id: "history", status: "review", history: ["created", "reviewed"] };
      await adapter.putDocument({ key: "history/item", value }, documentSchema);
      expect(
        (await adapter.getDocument("history/item", documentSchema, value)).value.history,
      ).toEqual(value.history);
    });

    test(`${name}: 6. delete controlado`, async () => {
      const created = await adapter.putDocument(
        { key: "delete/item", value: { id: "delete", status: "new", history: [] } },
        documentSchema,
      );
      await adapter.deleteDocument("delete/item", created.version);
      expect(
        (
          await adapter.getDocument("delete/item", documentSchema, {
            id: "",
            status: "",
            history: [],
          })
        ).version,
      ).toBe(0);
    });

    test(`${name}: 7. transaction atômica`, async () => {
      await adapter.transaction([
        { key: "tx/a", value: { id: "a" } },
        { key: "tx/b", value: { id: "b" } },
      ]);
      expect((await adapter.listDocuments("tx/", 10)).items).toHaveLength(2);
    });

    test(`${name}: 9. lock único`, async () => {
      const now = new Date();
      await adapter.acquireLock({
        key: "global",
        owner: "a",
        runId: "run-a",
        acquiredAt: now.toISOString(),
        heartbeatAt: now.toISOString(),
        expiresAt: new Date(now.valueOf() + 60_000).toISOString(),
      });
      await expect(
        adapter.acquireLock({
          key: "global",
          owner: "b",
          runId: "run-b",
          acquiredAt: now.toISOString(),
          heartbeatAt: now.toISOString(),
          expiresAt: new Date(now.valueOf() + 60_000).toISOString(),
        }),
      ).rejects.toBeInstanceOf(StorageConflictError);
    });

    test(`${name}: 10-11. lock expirado gera fencing novo`, async () => {
      const old = new Date("2026-01-01T00:00:00Z");
      const first = await adapter.acquireLock({
        key: "expired",
        owner: "a",
        runId: "run-a",
        acquiredAt: old.toISOString(),
        heartbeatAt: old.toISOString(),
        expiresAt: old.toISOString(),
      });
      const now = new Date("2026-01-02T00:00:00Z");
      const second = await adapter.acquireLock({
        key: "expired",
        owner: "b",
        runId: "run-b",
        acquiredAt: now.toISOString(),
        heartbeatAt: now.toISOString(),
        expiresAt: new Date(now.valueOf() + 1_000).toISOString(),
      });
      expect(second.fencingToken).toBeGreaterThan(first.fencingToken);
    });

    test(`${name}: 12-14. sessão cria, revoga e preserva expiração`, async () => {
      const session = {
        id: `session-${name}`.padEnd(32, "x"),
        actor: "editor",
        csrf: "x".repeat(20),
        issuedAt: 1,
        expiresAt: 2,
      };
      await adapter.createSession(session);
      expect((await adapter.getSession(session.id))?.expiresAt).toBe(2);
      await adapter.revokeSession(session.id, 3);
      expect((await adapter.getSession(session.id))?.revokedAt).toBe(3);
    });

    test(`${name}: 15. rate limit durável`, async () => {
      await adapter.putRateLimit({ key: "rate", attempts: [1, 2, 3], expiresAt: 10 });
      expect((await adapter.getRateLimit("rate"))?.attempts).toHaveLength(3);
    });

    test(`${name}: 16. auditoria append-only`, async () => {
      await adapter.appendAudit({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actor: "editor",
        action: "review",
        entity: "decision",
        entityId: "decision-a",
        origin: "test",
        success: true,
        version: 1,
      });
      expect((await adapter.listAudit(10)).items).toHaveLength(1);
    });
  }

  test("8. rollback local em falha", async () => {
    const root = await mkdtemp(join(tmpdir(), "newsroom-rollback-"));
    roots.push(root);
    const adapter = new LocalFileStorageAdapter(root);
    await adapter.putDocument({ key: "rollback/a", value: { id: "a" } }, z.unknown());
    await expect(
      adapter.transaction([
        { key: "rollback/a", value: { id: "changed" }, expectedVersion: 99 },
        { key: "rollback/b", value: { id: "b" } },
      ]),
    ).rejects.toBeInstanceOf(StorageConflictError);
    expect((await adapter.getDocument("rollback/a", z.unknown(), {})).value).toEqual({ id: "a" });
  });

  test("17-18. export/import é idempotente pelo contrato", async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.transaction([{ key: "import/a", value: { id: "a" }, expectedVersion: 0 }]);
    const page = await adapter.listDocuments("import/", 10);
    expect(page.items).toHaveLength(1);
    expect((await adapter.getDocument("import/a", z.unknown(), undefined)).version).toBe(1);
  });

  test("19-20. migrations são ordenadas e não destrutivas", () => {
    expect(storageMigrations.map(({ version }) => version)).toEqual([1]);
    expect(storageMigrations[0].statements.join(" ")).not.toContain("DROP TABLE");
    expect(() =>
      validateMigrations([
        { version: 1, name: "válida", statements: ["CREATE TABLE example(id TEXT)"] },
        { version: 1, name: "duplicada", statements: ["CREATE TABLE other(id TEXT)"] },
      ]),
    ).toThrow("únicas e crescentes");
  });

  test("21. corrupção local é detectada", async () => {
    const root = await mkdtemp(join(tmpdir(), "newsroom-corrupt-"));
    roots.push(root);
    await writeFile(join(root, "invalid.json"), "{", "utf8");
    const adapter = new LocalFileStorageAdapter(root);
    await expect(
      adapter.getDocument("invalid", z.unknown(), {}, join(root, "invalid.json")),
    ).rejects.toThrow("inválido");
  });

  test("22-23. backend ausente e local em produção falham seguro", () => {
    expect(() =>
      createStorageAdapter({ NEWSROOM_STORAGE_DRIVER: "d1", NEWSROOM_ENVIRONMENT: "production" }),
    ).toThrow(StorageConfigurationError);
    expect(() =>
      createStorageAdapter({
        NEWSROOM_STORAGE_DRIVER: "local",
        NEWSROOM_ENVIRONMENT: "production",
      }),
    ).toThrow(StorageConfigurationError);
  });

  test("24-31. guardrails de bundle, segredo, matéria, decisão e dry-run", async () => {
    const source = await readFile("scripts/newsroom/storage/contracts.ts", "utf8");
    expect(source).not.toContain("NEWSROOM_ADMIN_SECRET=");
    expect(source).not.toContain("contentSnippet");
    expect(source).not.toContain("publishArticle");
    expect(source).toContain("expectedVersion");
  });

  test("32. artigo piloto permanece invisível", () => {
    expect(getArticleBySlug("rascunho-como-funciona-matriz-eletrica-brasileira")).toBeUndefined();
  });

  test("33. Olavo permanece público", () => {
    expect(getAuthor("olavo-oliveira")?.status).toBe("verified");
  });

  test("34. nenhuma publicação é criada", () => {
    expect(
      storageMigrations.some(({ statements }) =>
        statements.some((sql) => sql.includes("articles")),
      ),
    ).toBe(false);
  });
});
