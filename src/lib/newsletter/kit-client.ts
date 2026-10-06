import { z } from "zod";

const kitSubscriberResponseSchema = z.object({
  subscriber: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    state: z.string(),
  }),
});

export class KitClientError extends Error {
  constructor(readonly code: "timeout" | "unavailable" | "invalid-response") {
    super(`Kit request failed: ${code}`);
    this.name = "KitClientError";
  }
}

export class KitNewsletterClient {
  constructor(
    private readonly apiKey: string,
    private readonly formId: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async post(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetcher(`https://api.kit.com/v4${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-kit-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new KitClientError("unavailable");
      try {
        return await response.json();
      } catch {
        throw new KitClientError("invalid-response");
      }
    } catch (error) {
      if (error instanceof KitClientError) throw error;
      throw new KitClientError(
        error instanceof DOMException && error.name === "AbortError" ? "timeout" : "unavailable",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async createInactiveSubscriber(emailNormalized: string): Promise<{ id: string }> {
    const result = kitSubscriberResponseSchema.safeParse(
      await this.post("/subscribers", { email_address: emailNormalized, state: "inactive" }),
    );
    if (!result.success) throw new KitClientError("invalid-response");
    return { id: result.data.subscriber.id };
  }

  async associateSubscriberWithForm(subscriberId: string, referrer: string): Promise<void> {
    const result = kitSubscriberResponseSchema.safeParse(
      await this.post(
        `/forms/${encodeURIComponent(this.formId)}/subscribers/${encodeURIComponent(subscriberId)}`,
        { referrer },
      ),
    );
    if (!result.success) throw new KitClientError("invalid-response");
  }
}
