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

export class KitOptInRequiredError extends Error {
  constructor(
    readonly subscriberId: string,
    readonly state: string,
  ) {
    super("Kit did not start a fresh double opt-in.");
  }
}

export class KitNewsletterClient {
  constructor(
    private readonly apiKey: string,
    private readonly formId: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: string, method: "GET" | "POST", body?: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await this.fetcher(`https://api.kit.com/v4${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          "x-kit-api-key": this.apiKey,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
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
      await this.request("/subscribers", "POST", {
        email_address: emailNormalized,
        state: "inactive",
      }),
    );
    // Existing subscribers retain their state on upsert. Never treat an existing
    // active/cancelled record as the start of a fresh double opt-in.
    if (!result.success) throw new KitClientError("invalid-response");
    if (result.data.subscriber.state !== "inactive")
      throw new KitOptInRequiredError(result.data.subscriber.id, result.data.subscriber.state);
    return { id: result.data.subscriber.id };
  }

  async associateSubscriberWithForm(subscriberId: string, referrer: string): Promise<void> {
    const result = kitSubscriberResponseSchema.safeParse(
      await this.request(
        `/forms/${encodeURIComponent(this.formId)}/subscribers/${encodeURIComponent(subscriberId)}`,
        "POST",
        { referrer },
      ),
    );
    if (!result.success) throw new KitClientError("invalid-response");
  }

  async getSubscriber(subscriberId: string) {
    const schema = z.object({
      subscriber: z.object({
        id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).transform(String),
        email_address: z.string().trim().toLowerCase().pipe(z.email()),
        state: z.enum(["active", "inactive", "cancelled", "bounced", "complained"]),
      }),
    });
    const result = schema.safeParse(
      await this.request(`/subscribers/${encodeURIComponent(subscriberId)}`, "GET"),
    );
    if (!result.success || result.data.subscriber.id !== subscriberId)
      throw new KitClientError("invalid-response");
    return result.data.subscriber;
  }
}
