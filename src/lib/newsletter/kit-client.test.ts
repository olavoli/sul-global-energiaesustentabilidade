import { describe, expect, test } from "bun:test";
import { KitClientError, KitNewsletterClient } from "./kit-client";

describe("cliente Kit V4", () => {
  test("cria subscriber explicitamente inactive e associa ao Form", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return Response.json({ subscriber: { id: 42, state: "inactive" } });
    }) as unknown as typeof fetch;
    const client = new KitNewsletterClient("server-key", "77", fetcher);
    expect(await client.createInactiveSubscriber("reader@example.com")).toEqual({ id: "42" });
    await client.associateSubscriberWithForm("42", "https://sulglobalenergia.com.br/newsletter");
    expect(calls[0].url).toBe("https://api.kit.com/v4/subscribers");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      email_address: "reader@example.com",
      state: "inactive",
    });
    expect(calls[1].url).toBe("https://api.kit.com/v4/forms/77/subscribers/42");
    expect(calls[0].init?.headers).toMatchObject({ "x-kit-api-key": "server-key" });
  });

  test("falha fechada em status não-2xx e resposta inválida", async () => {
    const unavailable = new KitNewsletterClient(
      "key",
      "1",
      (async () => new Response(null, { status: 503 })) as unknown as typeof fetch,
    );
    await expect(unavailable.createInactiveSubscriber("reader@example.com")).rejects.toBeInstanceOf(
      KitClientError,
    );
    const invalid = new KitNewsletterClient("key", "1", (async () =>
      Response.json({ invalid: true })) as unknown as typeof fetch);
    await expect(invalid.createInactiveSubscriber("reader@example.com")).rejects.toBeInstanceOf(
      KitClientError,
    );
  });

  test("timeout aborta a chamada sem expor payload", async () => {
    const fetcher = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      })) as unknown as typeof fetch;
    const client = new KitNewsletterClient("server-key", "77", fetcher);
    await expect(client.createInactiveSubscriber("reader@example.com")).rejects.toMatchObject({
      code: "timeout",
      operation: "create-subscriber",
      category: "timeout",
      httpStatus: null,
    });
  }, 10_000);

  test.each([
    [401, "authentication"],
    [403, "authorization"],
    [422, "validation"],
    [400, "validation"],
    [503, "http-error"],
  ])("preserva HTTP %s e categoria %s sem corpo de erro", async (status, category) => {
    const client = new KitNewsletterClient(
      "secret-key",
      "77",
      (async () =>
        new Response("private-response reader@example.com", {
          status: Number(status),
        })) as unknown as typeof fetch,
    );
    const error = await client
      .createInactiveSubscriber("reader@example.com")
      .catch((error: unknown) => error);
    expect(error).toMatchObject({ operation: "create-subscriber", httpStatus: status, category });
    expect(JSON.stringify(error)).not.toContain("private-response");
    expect(JSON.stringify(error)).not.toContain("reader@example.com");
    expect(JSON.stringify(error)).not.toContain("secret-key");
  });

  test("classifica falha de rede sem preservar a mensagem original", async () => {
    const client = new KitNewsletterClient("secret-key", "77", (async () => {
      throw new Error("secret-key reader@example.com");
    }) as unknown as typeof fetch);
    const error = await client
      .createInactiveSubscriber("reader@example.com")
      .catch((error: unknown) => error);
    expect(error).toMatchObject({
      operation: "create-subscriber",
      category: "network",
      httpStatus: null,
    });
    expect(JSON.stringify(error)).not.toContain("reader@example.com");
  });

  test.each(["json", "schema"])("preserva status de resposta inválida: %s", async (kind) => {
    const client = new KitNewsletterClient("key", "77", (async () =>
      kind === "json"
        ? new Response("not-json", { status: 201 })
        : Response.json({ subscriber: { id: 42 } }, { status: 201 })) as unknown as typeof fetch);
    await expect(client.createInactiveSubscriber("reader@example.com")).rejects.toMatchObject({
      operation: "create-subscriber",
      category: "invalid-response",
      httpStatus: 201,
    });
  });

  test("distingue operações de associação e consulta", async () => {
    const client = new KitNewsletterClient(
      "key",
      "77",
      (async () => new Response(null, { status: 403 })) as unknown as typeof fetch,
    );
    await expect(
      client.associateSubscriberWithForm("42", "https://example.com"),
    ).rejects.toMatchObject({ operation: "associate-form", httpStatus: 403 });
    await expect(client.getSubscriber("42")).rejects.toMatchObject({
      operation: "get-subscriber",
      httpStatus: 403,
    });
  });
});
