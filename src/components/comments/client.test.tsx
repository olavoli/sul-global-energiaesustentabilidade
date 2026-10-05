import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CommentsSection, CommentEntry } from "./CommentsSection";
import { commentRequest, mergeComments } from "./client";
import type { PublicComment } from "@/lib/comments/repository";
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const item: PublicComment = {
  id: "one",
  publicName: "Leitora",
  bodyText: "Texto publicado.",
  approvedAt: "2026-10-04T12:00:00.000Z",
  publishedAt: "2026-10-04T12:00:00.000Z",
  parentCommentId: null,
  rootCommentId: null,
  replyingTo: null,
  likes: 0,
  dislikes: 0,
  viewerReaction: null,
};
describe("cliente e apresentação dos comentários", () => {
  test("entrada editorial escapa XSS, mostra ações e contexto sem e-mail", () => {
    const html = renderToStaticMarkup(
      <CommentEntry
        comment={{
          ...item,
          bodyText: "<script>alert(1)</script>",
          parentCommentId: "parent",
          rootCommentId: "root",
          replyingTo: "Fulano",
        }}
        endpoint="/comments"
        siteKey="test"
        onReply={() => undefined}
        onUpdate={() => undefined}
      />,
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Respondendo a Fulano");
    for (const text of ["Gostei", "Não gostei", "Responder", "Denunciar"])
      expect(html).toContain(text);
    expect(html).not.toMatch(/email|visitor_hash/);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("overflow-wrap:anywhere");
  });
  test("coluna editorial centralizada, fluida e estado de carregamento acessível", () => {
    const html = renderToStaticMarkup(<CommentsSection articleSlug="o-que-e-energia" />);
    expect(html).toContain("mx-auto w-full max-w-[72ch]");
    expect(html).toContain('data-tts-exclude="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Carregando comentários");
  });
  test("publicação retorna DTO e o incorpora imediatamente, sem uma leitura adicional", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return Response.json({ comment: item }, { status: 201 });
    }) as unknown as typeof fetch;
    const result = await commentRequest<{ comment: PublicComment }>(
      "/api/articles/o-que-e-energia/comments",
      { method: "POST", body: "{}" },
    );
    expect(mergeComments([], [result.comment])).toEqual([item]);
    expect(calls).toBe(1);
  });
  test("paginação deduplica itens e atualização de reação substitui o estado anterior", () => {
    const updated = { ...item, likes: 1, viewerReaction: "like" as const };
    expect(mergeComments([item], [updated])).toEqual([updated]);
    expect(mergeComments([item], [item, { ...item, id: "two" }])).toHaveLength(2);
  });
  test("falha de carregamento e rede são propagadas para o estado de erro", async () => {
    globalThis.fetch = (async () =>
      Response.json(
        { error: "Comentários indisponíveis." },
        { status: 503 },
      )) as unknown as typeof fetch;
    await expect(commentRequest("/comments")).rejects.toThrow("Comentários indisponíveis.");
    globalThis.fetch = (async () => {
      throw new Error("Falha de rede");
    }) as unknown as typeof fetch;
    await expect(commentRequest("/comments")).rejects.toThrow("Falha de rede");
  });
  test("pedido mantém cookie same-origin e permite cancelamento na troca de artigo", async () => {
    const controller = new AbortController();
    let options: RequestInit | undefined;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      options = init;
      return Response.json({ items: [] });
    }) as unknown as typeof fetch;
    await commentRequest("/comments", { signal: controller.signal });
    expect(options?.credentials).toBe("same-origin");
    expect(options?.signal).toBe(controller.signal);
  });
});
