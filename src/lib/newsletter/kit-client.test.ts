import { describe, expect, test } from "bun:test";
import { KitClientError, KitNewsletterClient } from "./kit-client";

describe("cliente Kit V4", () => {
  test("cria subscriber explicitamente inactive e associa ao Form", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = (async (input, init) => {
      calls.push({ url: String(input), init });
      return Response.json({ subscriber: { id: 42, state: "inactive" } });
    }) as typeof fetch;
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
      })) as typeof fetch;
    const client = new KitNewsletterClient("server-key", "77", fetcher);
    await expect(client.createInactiveSubscriber("reader@example.com")).rejects.toMatchObject({
      code: "timeout",
    });
  }, 6_000);
});
