import { describe, expect, test } from "bun:test";
import { LocalCommentDatabase } from "./test-database";
import { CommentTransitionError, D1PublicCommentRepository } from "./repository";
import { commentRateAllowed } from "./rate-limit";
import { commentVisitor, commentHmac } from "./visitor";
import { publicCommentInputSchema } from "./contracts";

const hash = "a".repeat(64);
const input = {
  articleSlug: "o-que-e-energia",
  publicName: "Leitora",
  emailNormalized: "privado@example.com",
  emailHash: hash,
  bodyText: "Uma contribuição.",
};
function fixture() {
  const database = new LocalCommentDatabase();
  return { database, repo: new D1PublicCommentRepository(database) };
}
const moderation = (id: string) => ({
  commentId: id,
  actor: "editor",
  reason: "Regras de participação",
});

describe("interações de comentários em SQLite local com FKs", () => {
  test("publicação imediata, datas e DTO sem email, hash ou consentimento", async () => {
    const { database, repo } = fixture();
    const comment = await repo.createPublishedComment(input);
    const stored = await repo.getCommentById(comment.id);
    expect(stored?.status).toBe("approved");
    expect(stored?.publishedAt).toBe(comment.publishedAt);
    expect(comment.publishedAt).toBe(comment.approvedAt);
    expect(JSON.stringify(comment)).not.toMatch(/email|hash|consent|privado/);
    expect((await repo.listApprovedComments(input.articleSlug)).items).toHaveLength(1);
    expect(
      database.sqlite.query("SELECT COUNT(*) AS n FROM comment_moderation_events").get(),
    ).toEqual({ n: 0 });
  });
  test("comentários históricos são preservados na migration, sem publicar pendentes", async () => {
    const database = new LocalCommentDatabase(3);
    const repo = new D1PublicCommentRepository(database);
    const pending = await repo.createPendingComment(input);
    // Approval before v4 uses the original schema, not the new code path.
    database.sqlite
      .query("UPDATE public_comments SET status='approved',approved_at=created_at WHERE id=?")
      .run(pending.id);
    const pending2 = await repo.createPendingComment(input);
    const { storageMigrations } = await import("../../../scripts/newsroom/storage/migrations");
    for (const sql of storageMigrations[3].statements) database.sqlite.exec(sql);
    expect(
      (await repo.listApprovedComments(input.articleSlug)).items.map((item) => item.id),
    ).toEqual([pending.id]);
    expect((await repo.getCommentById(pending.id))?.publishedAt).toBe(pending.createdAt);
    expect((await repo.getCommentById(pending2.id))?.status).toBe("pending");
    await repo.react(input.articleSlug, pending.id, hash, "like");
    expect(
      (await repo.createPublishedComment({ ...input, parentCommentId: pending.id })).rootCommentId,
    ).toBe(pending.id);
  });
  test("resposta e resposta à resposta têm a mesma raiz", async () => {
    const { repo } = fixture();
    const root = await repo.createPublishedComment(input);
    const reply = await repo.createPublishedComment({ ...input, parentCommentId: root.id });
    const next = await repo.createPublishedComment({ ...input, parentCommentId: reply.id });
    const fourth = await repo.createPublishedComment({ ...input, parentCommentId: next.id });
    expect(root).toMatchObject({ parentCommentId: null, rootCommentId: null });
    expect(reply).toMatchObject({ parentCommentId: root.id, rootCommentId: root.id });
    expect(fourth).toMatchObject({ parentCommentId: next.id, rootCommentId: root.id });
    expect(next.parentCommentId).toBe(reply.id);
    expect(next.rootCommentId).toBe(root.id);
    expect(next.replyingTo).toBe(input.publicName);
    expect((await repo.listApprovedComments(input.articleSlug)).items).toHaveLength(1);
    expect((await repo.listReplies(input.articleSlug, root.id)).items).toHaveLength(3);
  });
  test("rejeita pai inexistente, de outro artigo, ocultado, spam e excluído", async () => {
    const { repo } = fixture();
    const root = await repo.createPublishedComment(input);
    for (const parentCommentId of ["missing", root.id]) {
      await expect(
        repo.createPublishedComment({
          ...input,
          articleSlug: parentCommentId === root.id ? "outro-artigo" : input.articleSlug,
          parentCommentId,
        }),
      ).rejects.toBeInstanceOf(CommentTransitionError);
    }
    await repo.rejectComment(moderation(root.id));
    await expect(
      repo.createPublishedComment({ ...input, parentCommentId: root.id }),
    ).rejects.toThrow();
    await repo.markCommentAsSpam(moderation(root.id));
    await expect(
      repo.createPublishedComment({ ...input, parentCommentId: root.id }),
    ).rejects.toThrow();
    await repo.softDeleteAndAnonymize(moderation(root.id));
    await expect(
      repo.createPublishedComment({ ...input, parentCommentId: root.id }),
    ).rejects.toThrow();
  });
  test("raiz arbitrária não é aceita no payload", () => {
    expect(
      publicCommentInputSchema.safeParse({
        articleSlug: input.articleSlug,
        publicName: "Pessoa",
        email: input.emailNormalized,
        bodyText: input.bodyText,
        consentAccepted: true,
        turnstileToken: "token",
        rootCommentId: "arbitrary",
      }).success,
    ).toBe(false);
  });
  test("ocultar raiz oculta tópico, preserva respostas e impede interação", async () => {
    const { repo } = fixture();
    const root = await repo.createPublishedComment(input);
    const reply = await repo.createPublishedComment({ ...input, parentCommentId: root.id });
    await repo.rejectComment(moderation(root.id));
    expect(await repo.getPublicComment(input.articleSlug, reply.id)).toBeUndefined();
    expect((await repo.getCommentById(reply.id))?.bodyText).toBe(input.bodyText);
    await expect(repo.react(input.articleSlug, reply.id, hash, "like")).rejects.toThrow();
    await expect(repo.listReplies(input.articleSlug, root.id)).rejects.toThrow();
    await repo.restoreComment(moderation(root.id));
    expect((await repo.listReplies(input.articleSlug, root.id)).items).toHaveLength(1);
  });
  test("ocultar pai intermediário não vaza seu nome nem texto", async () => {
    const { repo } = fixture();
    const root = await repo.createPublishedComment(input);
    const parent = await repo.createPublishedComment({
      ...input,
      publicName: "Nome privado",
      parentCommentId: root.id,
    });
    const child = await repo.createPublishedComment({ ...input, parentCommentId: parent.id });
    await repo.rejectComment(moderation(parent.id));
    const list = await repo.listReplies(input.articleSlug, root.id);
    expect(list.items.map((item) => item.id)).toEqual([child.id]);
    expect(list.items[0].replyingTo).toBeNull();
  });
  test("paginação de principais e respostas não duplica nem perde registros", async () => {
    const { repo } = fixture();
    const roots = [];
    for (let i = 0; i < 5; i++) roots.push(await repo.createPublishedComment(input));
    const first = await repo.listApprovedComments(input.articleSlug, { limit: 2 });
    const second = await repo.listApprovedComments(input.articleSlug, {
      limit: 2,
      cursor: first.cursor,
    });
    const third = await repo.listApprovedComments(input.articleSlug, {
      limit: 2,
      cursor: second.cursor,
    });
    expect(
      new Set([...first.items, ...second.items, ...third.items].map((item) => item.id)).size,
    ).toBe(5);
    for (let i = 0; i < 3; i++)
      await repo.createPublishedComment({ ...input, parentCommentId: roots[0].id });
    const replies = await repo.listReplies(input.articleSlug, roots[0].id, { limit: 2 });
    const rest = await repo.listReplies(input.articleSlug, roots[0].id, {
      limit: 2,
      cursor: replies.cursor,
    });
    expect(new Set([...replies.items, ...rest.items].map((item) => item.id)).size).toBe(3);
    expect(rest.cursor).toBeUndefined();
    await expect(repo.listApprovedComments(input.articleSlug, { cursor: "bad" })).rejects.toThrow(
      "Cursor",
    );
  });
  test("like, dislike, troca e remoção mantêm contadores independentes", async () => {
    const { repo } = fixture();
    const root = await repo.createPublishedComment(input);
    expect(await repo.react(input.articleSlug, root.id, hash, "like")).toMatchObject({
      likes: 1,
      dislikes: 0,
      viewerReaction: "like",
    });
    expect(await repo.react(input.articleSlug, root.id, hash, "dislike")).toMatchObject({
      likes: 0,
      dislikes: 1,
      viewerReaction: "dislike",
    });
    expect(await repo.react(input.articleSlug, root.id, hash, "like")).toMatchObject({
      likes: 1,
      dislikes: 0,
    });
    expect(await repo.react(input.articleSlug, root.id, "b".repeat(64), "dislike")).toMatchObject({
      likes: 1,
      dislikes: 1,
    });
    expect(await repo.react(input.articleSlug, root.id, hash, null)).toMatchObject({
      likes: 0,
      dislikes: 1,
      viewerReaction: null,
    });
    expect(await repo.react(input.articleSlug, root.id, hash, null)).toMatchObject({
      likes: 0,
      dislikes: 1,
    });
  });
  test("reações simultâneas da mesma identidade não inflacionam contadores", async () => {
    const { database, repo } = fixture();
    const root = await repo.createPublishedComment(input);
    await Promise.all(
      Array.from({ length: 20 }, () => repo.react(input.articleSlug, root.id, hash, "like")),
    );
    expect((await repo.getPublicComment(input.articleSlug, root.id, hash))?.likes).toBe(1);
    expect(database.sqlite.query("SELECT COUNT(*) AS n FROM comment_reactions").get()).toEqual({
      n: 1,
    });
    await Promise.all(
      ["like", "dislike", "like", "dislike"].map((value) =>
        repo.react(input.articleSlug, root.id, hash, value as "like" | "dislike"),
      ),
    );
    const result = await repo.getPublicComment(input.articleSlug, root.id, hash);
    expect(result!.likes + result!.dislikes).toBe(1);
  });
  test("denúncia única, sem ocultação automática, revisão privada e rejeição de duplicadas", async () => {
    const { database, repo } = fixture();
    const root = await repo.createPublishedComment(input);
    const report = {
      reason: "abuso" as const,
      detail: "Conteúdo abusivo.",
      turnstileToken: "token",
    };
    const results = await Promise.allSettled([
      repo.report(input.articleSlug, root.id, hash, report),
      repo.report(input.articleSlug, root.id, hash, report),
    ]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect((await repo.getCommentById(root.id))?.status).toBe("approved");
    expect(database.sqlite.query("SELECT COUNT(*) AS n FROM comment_reports").get()).toEqual({
      n: 1,
    });
    const page = await repo.listReports("open");
    expect(JSON.stringify(page)).not.toMatch(/visitor_hash|email|privado/);
    await repo.reviewReport(page.items[0].id, "editor", "reviewed");
    expect((await repo.listReports("open")).items).toHaveLength(0);
    expect((await repo.listReports("reviewed")).items).toHaveLength(1);
    await expect(repo.reviewReport(page.items[0].id, "editor", "dismissed")).rejects.toThrow();
  });
  test("moderação posterior preserva data, registra eventos e restaura spam", async () => {
    const { database, repo } = fixture();
    const root = await repo.createPublishedComment(input);
    await repo.markCommentAsSpam(moderation(root.id));
    expect(await repo.getPublicComment(input.articleSlug, root.id)).toBeUndefined();
    await repo.restoreComment(moderation(root.id));
    expect((await repo.getPublicComment(input.articleSlug, root.id))?.publishedAt).toBe(
      root.publishedAt,
    );
    await repo.rejectComment(moderation(root.id));
    await repo.restoreComment(moderation(root.id));
    expect(
      database.sqlite.query("SELECT COUNT(*) AS n FROM comment_moderation_events").get(),
    ).toEqual({ n: 4 });
    await expect(repo.restoreComment(moderation(root.id))).rejects.toThrow();
    expect(
      database.sqlite.query("SELECT COUNT(*) AS n FROM comment_moderation_events").get(),
    ).toEqual({ n: 4 });
  });
  test("excluído ou anonimizado não pode ser restaurado", async () => {
    const { repo } = fixture();
    const root = await repo.createPublishedComment(input);
    await repo.softDeleteAndAnonymize(moderation(root.id));
    expect((await repo.getCommentById(root.id))?.bodyText).toBeNull();
    await expect(repo.restoreComment(moderation(root.id))).rejects.toThrow();
    const database = new LocalCommentDatabase();
    const historical = new D1PublicCommentRepository(
      database,
      () => new Date("2026-01-01T00:00:00.000Z"),
    );
    const old = await historical.createPublishedComment(input);
    await historical.rejectComment(moderation(old.id));
    const current = new D1PublicCommentRepository(
      database,
      () => new Date("2026-10-04T00:00:00.000Z"),
    );
    expect(await current.anonymizeExpiredRejectedOrSpam()).toBe(1);
    await expect(current.restoreComment(moderation(old.id))).rejects.toThrow();
  });
  test("rate limit atômico respeita teto sob concorrência e separa ações", async () => {
    const { database } = fixture();
    const request = new Request("https://example.test", {
      headers: { "cf-connecting-ip": "192.0.2.1" },
    });
    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        commentRateAllowed(database, request, "test-secret", "submit"),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await commentRateAllowed(database, request, "test-secret", "reaction", hash)).toBe(true);
    expect(await commentRateAllowed(database, request, "test-secret", "report", hash)).toBe(true);
    const stored = database.sqlite.query("SELECT key,state_json FROM newsroom_rate_limits").all();
    expect(JSON.stringify(stored)).not.toContain("192.0.2.1");
  });
  test("cookie assinado, privado, seguro em HTTPS, adulteração e expiração", async () => {
    const issued = await commentVisitor(new Request("https://example.test"), "test-secret", true);
    expect(issued?.cookie).toContain("HttpOnly");
    expect(issued?.cookie).toContain("Secure");
    expect(issued?.cookie).toContain("SameSite=Lax");
    const cookie = issued!.cookie!.split(";")[0];
    expect(
      await commentVisitor(
        new Request("https://example.test", { headers: { cookie } }),
        "test-secret",
      ),
    ).toEqual({ hash: issued!.hash });
    expect(
      await commentVisitor(
        new Request("https://example.test", { headers: { cookie: cookie.slice(0, -1) + "x" } }),
        "test-secret",
      ),
    ).toBeUndefined();
    expect(
      await commentVisitor(
        new Request("https://example.test", { headers: { cookie } }),
        "wrong-secret",
      ),
    ).toBeUndefined();
    expect(
      (await commentVisitor(new Request("http://localhost"), "test-secret", true))?.cookie,
    ).not.toContain("Secure");
    expect(cookie).not.toContain(issued!.hash);
    expect(
      await commentVisitor(
        new Request("https://example.test", {
          headers: { cookie: cookie.replace(/\.\d{10}\./, ".1000000000.") },
        }),
        "test-secret",
      ),
    ).toBeUndefined();
  });
  test("foreign keys, pares parent/root, valores e hashes inválidos são rejeitados", async () => {
    const { database, repo } = fixture();
    const root = await repo.createPublishedComment(input);
    expect(() =>
      database.sqlite
        .query("INSERT INTO comment_reactions VALUES (?,'invalid','like','2026','2026')")
        .run(root.id),
    ).toThrow();
    expect(() =>
      database.sqlite
        .query("INSERT INTO comment_reactions VALUES (? ,?,'other','2026','2026')")
        .run(root.id, hash),
    ).toThrow();
    expect(() =>
      database.sqlite
        .query("INSERT INTO comment_reactions VALUES ('missing',?,'like','2026','2026')")
        .run(hash),
    ).toThrow();
    expect(() =>
      database.sqlite
        .query("UPDATE public_comments SET parent_comment_id=? WHERE id=?")
        .run(root.id, root.id),
    ).toThrow();
  });
  test("retenção respeita corte, limpa detalhes, é auditada e idempotente; anonimizado não vira spam", async () => {
    const database = new LocalCommentDatabase();
    let now = new Date("2026-01-01T00:00:00.000Z");
    const repo = new D1PublicCommentRepository(database, () => now);
    const root = await repo.createPublishedComment(input);
    await repo.report(input.articleSlug, root.id, hash, {
      reason: "privacidade",
      detail: "Dado pessoal reproduzido",
      turnstileToken: "token",
    });
    await repo.rejectComment(moderation(root.id));
    now = new Date("2026-03-31T23:59:59.999Z");
    expect(await repo.anonymizeExpiredRejectedOrSpam("editor")).toBe(0);
    expect((await repo.listReports("open")).items[0].detail).toBeTruthy();
    now = new Date("2026-04-01T00:00:00.000Z");
    expect(await repo.anonymizeExpiredRejectedOrSpam("editor")).toBe(1);
    expect(await repo.anonymizeExpiredRejectedOrSpam("editor")).toBe(0);
    expect(await repo.getCommentById(root.id)).toMatchObject({
      status: "rejected",
      publicName: null,
      emailNormalized: null,
      bodyText: null,
    });
    expect((await repo.listReports("open")).items[0]).toMatchObject({
      detail: null,
      reason: "privacidade",
      status: "open",
    });
    expect(database.sqlite.query("SELECT COUNT(*) AS n FROM newsroom_audit").get()).toEqual({
      n: 1,
    });
    await expect(repo.markCommentAsSpam(moderation(root.id))).rejects.toBeInstanceOf(
      CommentTransitionError,
    );
    expect((await repo.getCommentById(root.id))?.rejectedAt).toBe("2026-01-01T00:00:00.000Z");
  });
  test("exclusão limpa detalhe da denúncia e preserva revisão e eventos", async () => {
    const { repo, database } = fixture();
    const root = await repo.createPublishedComment(input);
    await repo.report(input.articleSlug, root.id, hash, {
      reason: "outro",
      detail: "Texto a apagar",
      turnstileToken: "token",
    });
    const report = (await repo.listReports("open")).items[0];
    await repo.reviewReport(report.id, "editor", "reviewed");
    await repo.softDeleteAndAnonymize(moderation(root.id));
    expect((await repo.listReports("reviewed")).items[0]).toMatchObject({
      detail: null,
      status: "reviewed",
      commentStatus: "deleted",
    });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS n FROM comment_moderation_events").get(),
    ).toEqual({ n: 1 });
  });
  test("tetos completos, expiração, quota histórica e concorrência de rate limits", async () => {
    const { database } = fixture();
    const request = new Request("https://example.test", {
      headers: { "cf-connecting-ip": "192.0.2.99" },
    });
    for (let i = 0; i < 60; i++)
      expect(await commentRateAllowed(database, request, "secret", "reaction", hash)).toBe(true);
    expect(await commentRateAllowed(database, request, "secret", "reaction", hash)).toBe(false);
    database.sqlite
      .query("UPDATE newsroom_rate_limits SET state_json=?")
      .run(JSON.stringify({ attempts: [Date.now() - 60_001] }));
    expect(await commentRateAllowed(database, request, "secret", "reaction", hash)).toBe(true);
    const reports = await Promise.all(
      Array.from({ length: 12 }, () =>
        commentRateAllowed(database, request, "secret", "report", hash),
      ),
    );
    expect(reports.filter(Boolean)).toHaveLength(5);
    expect(await commentRateAllowed(database, request, "secret", "report", hash)).toBe(false);
    const key = `comments:${await commentHmac("192.0.2.99", "secret:rate-limit")}`;
    database.sqlite
      .query("INSERT INTO newsroom_rate_limits VALUES (?,?,?)")
      .run(key, JSON.stringify({ attempts: Array(5).fill(Date.now()) }), Date.now() + 900_000);
    expect(await commentRateAllowed(database, request, "secret", "submit")).toBe(false);
    database.sqlite
      .query("UPDATE newsroom_rate_limits SET state_json=?")
      .run(JSON.stringify({ attempts: [Date.now() - 900_001] }));
    expect(await commentRateAllowed(database, request, "secret", "report", hash)).toBe(true);
    expect(await commentRateAllowed(database, request, "secret", "submit")).toBe(true);
    const concurrentDb = new LocalCommentDatabase();
    const reactions = await Promise.all(
      Array.from({ length: 67 }, () =>
        commentRateAllowed(concurrentDb, request, "secret", "reaction", hash),
      ),
    );
    expect(reactions.filter(Boolean)).toHaveLength(60);
  });
});
