import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LocalCommentDatabase } from "./test-database";
import { handleCommentsRequest } from "./handler";
import { D1PublicCommentRepository } from "./repository";

const origin = "https://sulglobalenergia.com.br";
const slug = "o-que-e-energia";
const endpoint = `${origin}/api/articles/${slug}/comments`;
const payload = {
  articleSlug: slug,
  publicName: "Leitora",
  email: "email-privado@example.com",
  bodyText: "Comentário público.",
  consentAccepted: true,
  honeypot: "",
  turnstileToken: "submit-token",
};
const originalFetch = globalThis.fetch;
let verification = true;
let hostname = "sulglobalenergia.com.br";
let wrongAction = false;
let calls = 0;
beforeEach(() => {
  verification = true;
  hostname = "sulglobalenergia.com.br";
  wrongAction = false;
  calls = 0;
  globalThis.fetch = (async (_input, init) => {
    calls++;
    const data = new URLSearchParams(String(init?.body));
    return Response.json({
      success: verification,
      hostname,
      action: wrongAction
        ? "wrong"
        : data.get("response")?.startsWith("report")
          ? "comment-report"
          : "comment-submit",
    });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
function fixture() {
  const database = new LocalCommentDatabase();
  const env = {
    COMMENTS_ENABLED: "true",
    COMMENTS_HASH_SECRET: "local-test-secret",
    TURNSTILE_SECRET_KEY: "local-test-turnstile",
    TURNSTILE_SITE_KEY: "test-site-key",
    NEWSROOM_DB: database,
  };
  const repo = new D1PublicCommentRepository(database);
  const send = (
    path = endpoint,
    method = "POST",
    body: unknown = payload,
    cookie?: string,
    headers: Record<string, string | undefined> = {},
  ) =>
    handleCommentsRequest(
      new Request(path, {
        method,
        headers: {
          origin,
          "content-type": "application/json",
          "cf-connecting-ip": "192.0.2.10",
          ...(cookie ? { cookie } : {}),
          ...Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== undefined)),
        },
        ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body) }),
      }),
      env,
    );
  return { database, env, repo, send };
}
describe("API pública de comentários", () => {
  test("GET fornece cookie; POST publica com 201 e DTO sem dados privados", async () => {
    const { send, repo } = fixture();
    const page = await send(endpoint, "GET");
    expect(page?.status).toBe(200);
    expect(page?.headers.get("set-cookie")).toContain("HttpOnly");
    const published = await send();
    expect(published?.status).toBe(201);
    const body = await published!.json();
    expect(body.comment.bodyText).toBe(payload.bodyText);
    expect(JSON.stringify(body)).not.toMatch(/email|hash|consent|privado/);
    expect((await repo.getCommentById(body.comment.id))?.status).toBe("approved");
  });
  test("honeypot silencioso não insere registro", async () => {
    const { send, repo } = fixture();
    expect((await send(endpoint, "POST", { ...payload, honeypot: "bot" }))?.status).toBe(202);
    expect((await repo.listApprovedComments(slug)).items).toHaveLength(0);
    expect(calls).toBe(0);
  });
  test.each([
    { consentAccepted: false },
    { bodyText: "<script>alert(1)</script>" },
    { publicName: "<img src=x onerror=alert(1)>" },
    { bodyText: "a".repeat(2001) },
    { parentCommentId: "" },
    { rootCommentId: "arbitrary" },
    { articleSlug: "outro-artigo" },
  ])("payload inválido não publicado: %j", async (change) => {
    const { send, repo } = fixture();
    expect((await send(endpoint, "POST", { ...payload, ...change }))?.status).toBe(400);
    expect((await repo.listApprovedComments(slug)).items).toHaveLength(0);
  });
  test("origem ausente, externa e cross-site são rejeitados", async () => {
    const { send } = fixture();
    for (const headers of [
      { origin: "" },
      { origin: "https://evil.example" },
      { "sec-fetch-site": "cross-site" },
    ])
      expect((await send(endpoint, "POST", payload, undefined, headers))?.status).toBe(403);
    expect(calls).toBe(0);
  });
  test("payload excedente e content-type incorreto", async () => {
    const { send } = fixture();
    expect((await send(endpoint, "POST", { ...payload, extra: "x".repeat(20_000) }))?.status).toBe(
      400,
    );
    expect(
      (await send(endpoint, "POST", payload, undefined, { "content-type": "text/plain" }))?.status,
    ).toBe(400);
  });
  test("Turnstile falha fechado para erro, hostname e action inválidos", async () => {
    const { send, repo } = fixture();
    verification = false;
    expect((await send())?.status).toBe(400);
    verification = true;
    hostname = "evil.example";
    expect((await send())?.status).toBe(400);
    hostname = "sulglobalenergia.com.br";
    wrongAction = true;
    expect((await send())?.status).toBe(400);
    expect((await repo.listApprovedComments(slug)).items).toHaveLength(0);
  });
  test("limite de submissão também protege verificação inválida", async () => {
    const { send } = fixture();
    verification = false;
    for (let i = 0; i < 5; i++) expect((await send())?.status).toBe(400);
    verification = true;
    expect((await send())?.status).toBe(429);
  });
  test("resposta recebe raiz calculada e rejeita pai entre artigos", async () => {
    const { send, repo } = fixture();
    const root = (await (await send())!.json()).comment;
    const reply = await send(endpoint, "POST", { ...payload, parentCommentId: root.id });
    expect(reply?.status).toBe(201);
    expect((await reply!.json()).comment.rootCommentId).toBe(root.id);
    const other = await repo.createPublishedComment({
      articleSlug: "outro-artigo",
      publicName: "Pessoa",
      emailNormalized: "a@example.com",
      emailHash: "a".repeat(64),
      bodyText: "Outro artigo.",
    });
    expect((await send(endpoint, "POST", { ...payload, parentCommentId: other.id }))?.status).toBe(
      409,
    );
  });
  test("GET pagina principais e respostas; cursor inválido retorna 400", async () => {
    const { send, repo } = fixture();
    const input = {
      articleSlug: slug,
      publicName: "Pessoa",
      emailNormalized: "a@example.com",
      emailHash: "a".repeat(64),
      bodyText: "Texto público.",
    };
    const root = await repo.createPublishedComment(input);
    await repo.createPublishedComment(input);
    await repo.createPublishedComment({ ...input, parentCommentId: root.id });
    await repo.createPublishedComment({ ...input, parentCommentId: root.id });
    const page = await (await send(`${endpoint}?limit=1`, "GET"))!.json();
    expect(page.items).toHaveLength(1);
    expect(page.cursor).toBeTruthy();
    expect((await send(`${endpoint}/${root.id}/replies?limit=1`, "GET"))?.status).toBe(200);
    expect((await send(`${endpoint}?cursor=invalid`, "GET"))?.status).toBe(400);
  });
  test("reação exige cookie válido e permite trocar/remover", async () => {
    const { send } = fixture();
    const cookie = (await send(endpoint, "GET"))!.headers.get("set-cookie")!.split(";")[0];
    const root = (await (await send())!.json()).comment;
    const path = `${endpoint}/${root.id}/reaction`;
    expect((await send(path, "PUT", { value: "like" }))?.status).toBe(403);
    expect((await send(path, "PUT", { value: "other" }, cookie))?.status).toBe(400);
    expect(
      (await (await send(path, "PUT", { value: "like" }, cookie))!.json()).comment,
    ).toMatchObject({ likes: 1, dislikes: 0, viewerReaction: "like" });
    expect(
      (await (await send(path, "PUT", { value: "dislike" }, cookie))!.json()).comment,
    ).toMatchObject({ likes: 0, dislikes: 1, viewerReaction: "dislike" });
    expect((await (await send(path, "DELETE", undefined, cookie))!.json()).comment).toMatchObject({
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
    });
  });
  test("denúncia exige Turnstile específico e deduplica sem ocultação", async () => {
    const { send, repo } = fixture();
    const cookie = (await send(endpoint, "GET"))!.headers.get("set-cookie")!.split(";")[0];
    const root = (await (await send())!.json()).comment;
    const path = `${endpoint}/${root.id}/reports`;
    expect(
      (await send(path, "POST", { reason: "spam", turnstileToken: "submit-token" }, cookie))
        ?.status,
    ).toBe(400);
    expect(
      (await send(path, "POST", { reason: "spam", turnstileToken: "report-token" }, cookie))
        ?.status,
    ).toBe(201);
    expect(
      (await send(path, "POST", { reason: "spam", turnstileToken: "report-token" }, cookie))
        ?.status,
    ).toBe(409);
    expect((await repo.getCommentById(root.id))?.status).toBe("approved");
    expect(
      (await send(path, "POST", { reason: "invalid", turnstileToken: "report-token" }, cookie))
        ?.status,
    ).toBe(400);
  });
  test("pai ocultado não recebe resposta nem reação/denúncia", async () => {
    const { send, repo } = fixture();
    const root = (await (await send())!.json()).comment;
    const cookie = (await send(endpoint, "GET"))!.headers.get("set-cookie")!.split(";")[0];
    await repo.rejectComment({ commentId: root.id, actor: "editor" });
    expect((await send(endpoint, "POST", { ...payload, parentCommentId: root.id }))?.status).toBe(
      409,
    );
    expect(
      (await send(`${endpoint}/${root.id}/reaction`, "PUT", { value: "like" }, cookie))?.status,
    ).toBe(409);
    expect(
      (
        await send(
          `${endpoint}/${root.id}/reports`,
          "POST",
          { reason: "spam", turnstileToken: "report-token" },
          cookie,
        )
      )?.status,
    ).toBe(409);
  });
  test("artigo inexistente, método inválido e binding indisponível falham seguro", async () => {
    const { send, env } = fixture();
    expect((await send(`${origin}/api/articles/nao-existe/comments`, "GET"))?.status).toBe(404);
    expect((await send(endpoint, "PUT", {}))?.status).toBe(405);
    expect(
      (await handleCommentsRequest(new Request(endpoint), { ...env, NEWSROOM_DB: undefined }))
        ?.status,
    ).toBe(503);
  });
});
