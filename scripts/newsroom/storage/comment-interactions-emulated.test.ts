import { beforeAll, afterAll, expect, test } from "bun:test";
import { Miniflare } from "miniflare";
import { applyMigrations, storageMigrations } from "./migrations";
import { D1PublicCommentRepository } from "../../../src/lib/comments/repository";
import { commentRateAllowed } from "../../../src/lib/comments/rate-limit";

let emulator: Miniflare;
beforeAll(() => {
  emulator = new Miniflare({
    modules: true,
    script: "export default {fetch(){return new Response('local')}}",
    // This isolated D1 fixture uses the date supported by the installed test runtime.
    // It does not load or change the project's deployment configuration.
    compatibilityDate: "2026-07-15",
    d1Databases: {
      NEWSROOM_DB: "comment-interactions-local",
      ROLLBACK_DB: "comments-rollback-local",
    },
    cf: false,
  });
});
afterAll(async () => {
  await emulator?.dispose();
});

test("D1 emulado local: migrations, concorrência, respostas e eventos atômicos", async () => {
  const database = await emulator.getD1Database("NEWSROOM_DB");
  expect(await applyMigrations(database)).toEqual([1, 2, 3, 4, 5]);
  expect(await applyMigrations(database)).toEqual([]);
  const repo = new D1PublicCommentRepository(database);
  const input = {
    articleSlug: "o-que-e-energia",
    publicName: "Local",
    emailNormalized: "local@example.com",
    emailHash: "a".repeat(64),
    bodyText: "Somente emulador local.",
  };
  const root = await repo.createPublishedComment(input);
  const reply = await repo.createPublishedComment({ ...input, parentCommentId: root.id });
  expect(reply.rootCommentId).toBe(root.id);
  await Promise.all(
    Array.from({ length: 12 }, () =>
      repo.react(input.articleSlug, reply.id, "b".repeat(64), "like"),
    ),
  );
  expect((await repo.getPublicComment(input.articleSlug, reply.id))?.likes).toBe(1);
  const request = new Request("http://localhost", {
    headers: { "cf-connecting-ip": "192.0.2.20" },
  });
  const reservations = await Promise.all(
    Array.from({ length: 12 }, () =>
      commentRateAllowed(database, request, "test-secret", "submit"),
    ),
  );
  expect(reservations.filter(Boolean)).toHaveLength(5);
  await repo.rejectComment({ commentId: root.id, actor: "editor" });
  expect(await repo.getPublicComment(input.articleSlug, reply.id)).toBeUndefined();
  await repo.restoreComment({ commentId: root.id, actor: "editor" });
  expect((await repo.listReplies(input.articleSlug, root.id)).items).toHaveLength(1);
  await expect(repo.restoreComment({ commentId: root.id, actor: "editor" })).rejects.toThrow();
  expect(
    (
      await database
        .prepare("SELECT COUNT(*) AS n FROM comment_moderation_events")
        .first<{ n: number }>()
    )?.n,
  ).toBe(2);
  expect((await database.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
  const historical = new D1PublicCommentRepository(
    database,
    () => new Date("2026-01-01T00:00:00.000Z"),
  );
  const expired = await historical.createPublishedComment(input);
  await historical.report(input.articleSlug, expired.id, "c".repeat(64), {
    reason: "privacidade",
    detail: "Detalhe local",
    turnstileToken: "token",
  });
  await historical.rejectComment({ commentId: expired.id, actor: "editor" });
  expect(await repo.anonymizeExpiredRejectedOrSpam("editor")).toBe(1);
  expect(await repo.anonymizeExpiredRejectedOrSpam("editor")).toBe(0);
  expect((await repo.listReports("open")).items[0].detail).toBeNull();
  expect(
    (await database.prepare("SELECT COUNT(*) AS n FROM newsroom_audit").first<{ n: number }>())?.n,
  ).toBe(1);
}, 60_000);

test("D1 real emulado: falha SQL na versão 4 reverte DDL, backfill e registro", async () => {
  const db = await emulator.getD1Database("ROLLBACK_DB");
  for (const migration of storageMigrations.slice(0, 3))
    await db.batch([
      ...migration.statements.map((sql) => db.prepare(sql)),
      db
        .prepare("INSERT INTO newsroom_migrations VALUES (?,?,?)")
        .bind(migration.version, migration.name, "2026-01-01"),
    ]);
  // A real schema collision makes the real executor fail after its ALTERs/backfill.
  const historicalTime = "2026-01-01T00:00:00.000Z";
  await db
    .prepare(
      `INSERT INTO public_comments (id,article_slug,status,public_name,email_normalized,email_hash,body_text,consent_version,consented_at,created_at,updated_at,approved_at)
      VALUES ('historical','o-que-e-energia','approved','Local','local@example.com',?,'Texto histórico','comments-v1',?,?,?,?)`,
    )
    .bind("a".repeat(64), historicalTime, historicalTime, historicalTime, historicalTime)
    .run();
  const original = await db.prepare("SELECT * FROM public_comments WHERE id='historical'").first();
  await db.prepare("CREATE INDEX public_comments_article_published ON public_comments(id)").run();
  await expect(applyMigrations(db)).rejects.toThrow();
  expect(
    (
      await db
        .prepare("SELECT version FROM newsroom_migrations ORDER BY version")
        .all<{ version: number }>()
    ).results?.map((row: { version: number }) => row.version),
  ).toEqual([1, 2, 3]);
  const columns = (
    await db.prepare("PRAGMA table_info(public_comments)").all<{ name: string }>()
  ).results?.map((row: { name: string }) => row.name);
  expect(columns).not.toContain("parent_comment_id");
  expect(columns).not.toContain("root_comment_id");
  expect(columns).not.toContain("published_at");
  expect(await db.prepare("SELECT * FROM public_comments WHERE id='historical'").first()).toEqual(
    original,
  );
  expect(
    (
      await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name IN ('comment_reactions','comment_reports')",
        )
        .all()
    ).results,
  ).toEqual([]);
  await db.prepare("DROP INDEX public_comments_article_published").run();
  expect(await applyMigrations(db)).toEqual([4, 5]);
  expect(
    (
      await db
        .prepare("SELECT published_at FROM public_comments WHERE id='historical'")
        .first<{ published_at: string }>()
    )?.published_at,
  ).toBe(historicalTime);
  expect(await applyMigrations(db)).toEqual([]);
}, 60_000);
