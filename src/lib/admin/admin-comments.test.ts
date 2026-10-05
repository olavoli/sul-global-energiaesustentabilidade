import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LocalCommentDatabase } from "../comments/test-database";
import { D1PublicCommentRepository } from "../comments/repository";
import { handleAdminRequest } from "./handler";
import { createSessionToken } from "./auth";
import { setStorageAdapter, storageAdapter } from "../../../scripts/newsroom/storage/runtime";
import { MemoryStorageAdapter } from "../../../scripts/newsroom/storage/memory-adapter";

beforeEach(() => setStorageAdapter(new MemoryStorageAdapter()));
afterEach(() => setStorageAdapter(undefined));
const secret = "local-admin-comments-test";
async function fixture() {
  const db = new LocalCommentDatabase();
  const repo = new D1PublicCommentRepository(db);
  const created = await createSessionToken(secret, "editor");
  const env = { NEWSROOM_ADMIN_SECRET: secret, COMMENTS_ENABLED: "true", NEWSROOM_DB: db };
  const send = (path: string, body?: unknown, csrf = created.session.csrf) =>
    handleAdminRequest(
      new Request(`http://localhost${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          cookie: `newsroom_admin=${created.token}`,
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
    );
  const input = {
    articleSlug: "o-que-e-energia",
    publicName: "Local",
    emailNormalized: "local@example.com",
    emailHash: "a".repeat(64),
    bodyText: "Comentário público.",
  };
  const comment = await repo.createPublishedComment(input);
  const action = (name: string, id = comment.id) =>
    send("/api/admin/comments/actions", { action: name, id, actor: "editor", note: "Regras" });
  return { db, repo, env, send, comment, action, input };
}
describe("painel de moderação posterior", () => {
  test("sessão e CSRF continuam obrigatórios", async () => {
    const { env, send, comment } = await fixture();
    expect(
      (await handleAdminRequest(new Request("http://localhost/api/admin/comments"), env))?.status,
    ).toBe(401);
    expect(
      (
        await send(
          "/api/admin/comments/actions",
          { action: "hide", id: comment.id, actor: "editor", note: "" },
          "wrong",
        )
      )?.status,
    ).toBe(403);
  });
  test("ocultar, restaurar, spam e excluir registram eventos; excluído não restaura", async () => {
    const { repo, action, comment, db } = await fixture();
    for (const name of ["hide", "restore", "spam", "restore", "delete"])
      expect((await action(name))?.status).toBe(200);
    expect((await repo.getCommentById(comment.id))?.status).toBe("deleted");
    expect((await action("restore"))?.status).toBe(400);
    expect(db.sqlite.query("SELECT COUNT(*) AS n FROM comment_moderation_events").get()).toEqual({
      n: 5,
    });
    expect((await storageAdapter().listAudit(100)).items.length).toBe(5);
  });
  test("lista publicados, pendentes históricos, ocultados e paginação", async () => {
    const { repo, send, input, action } = await fixture();
    for (let i = 0; i < 21; i++) await repo.createPublishedComment(input);
    const first = await (await send("/api/admin/comments?status=approved"))!.json();
    expect(first.data).toHaveLength(20);
    expect(first.cursor).toBeTruthy();
    const next = await (await send(
      `/api/admin/comments?status=approved&cursor=${encodeURIComponent(first.cursor)}`,
    ))!.json();
    expect(next.data).toHaveLength(2);
    await repo.createPendingComment(input);
    expect((await (await send("/api/admin/comments?status=pending"))!.json()).data).toHaveLength(1);
    await action("hide");
    expect((await (await send("/api/admin/comments?status=rejected"))!.json()).data).toHaveLength(
      1,
    );
  });
  test("denúncias são privadas, revisáveis e têm auditoria administrativa", async () => {
    const { repo, send, action, comment } = await fixture();
    await repo.report("o-que-e-energia", comment.id, "b".repeat(64), {
      reason: "spam",
      turnstileToken: "token",
    });
    const page = await (await send("/api/admin/comments/reports"))!.json();
    expect(page.data).toHaveLength(1);
    expect((await action("review-report", page.data[0].id))?.status).toBe(200);
    expect(
      (await (await send("/api/admin/comments/reports?status=reviewed"))!.json()).data,
    ).toHaveLength(1);
    expect((await repo.getCommentById(comment.id))?.status).toBe("approved");
    expect((await storageAdapter().listAudit(100)).items[0].action).toBe("comment.review-report");
  });
  test("leitura administrativa limpa elegíveis e handler rejeita spam anonimizado", async () => {
    const { db, repo, input, send, action } = await fixture();
    const old = new D1PublicCommentRepository(db, () => new Date("2026-01-01T00:00:00.000Z"));
    const comment = await old.createPublishedComment(input);
    await old.rejectComment({ commentId: comment.id, actor: "editor" });
    expect((await send("/api/admin/comments?status=rejected"))?.status).toBe(200);
    expect((await repo.getCommentById(comment.id))?.anonymizedAt).not.toBeNull();
    expect((await action("spam", comment.id))?.status).toBe(400);
    expect((await repo.getCommentById(comment.id))?.status).toBe("rejected");
    expect(
      (
        await db
          .prepare(
            "SELECT COUNT(*) AS n FROM newsroom_audit WHERE event_json LIKE '%comment.retention.anonymize%'",
          )
          .first<{ n: number }>()
      )?.n,
    ).toBe(1);
  });
});
