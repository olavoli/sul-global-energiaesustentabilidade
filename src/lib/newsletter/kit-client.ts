import { z } from "zod";

const kitSubscriberResponseSchema = z.object({
  subscriber: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    state: z.string(),
  }),
});

export type KitOperation = "create-subscriber" | "associate-form" | "get-subscriber";
type KitErrorCategory =
  | "authentication"
  | "authorization"
  | "validation"
  | "http-error"
  | "network"
  | "timeout"
  | "invalid-response";

export class KitClientError extends Error {
  constructor(
    readonly code: "timeout" | "unavailable" | "invalid-response",
    readonly operation: KitOperation,
    readonly httpStatus: number | null,
    readonly category: KitErrorCategory,
  ) {
    super(`Kit request failed: ${code}`);
    this.name = "KitClientError";
  }
}

export class KitOptInRequiredError extends Error {
  constructor(
    readonly subscriberId: string,
    readonly state: string,
    readonly httpStatus: number | null = null,
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

  private async request(
    operation: KitOperation,
    path: string,
    method: "GET" | "POST",
    body?: unknown,
  ): Promise<{ data: unknown; httpStatus: number }> {
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
      if (!response.ok)
        throw new KitClientError(
          "unavailable",
          operation,
          response.status,
          response.status === 401
            ? "authentication"
            : response.status === 403
              ? "authorization"
              : [400, 422].includes(response.status)
                ? "validation"
                : "http-error",
        );
      try {
        return { data: await response.json(), httpStatus: response.status };
      } catch {
        throw new KitClientError(
          "invalid-response",
          operation,
          response.status,
          "invalid-response",
        );
      }
    } catch (error) {
      if (error instanceof KitClientError) throw error;
      throw new KitClientError(
        error instanceof DOMException && error.name === "AbortError" ? "timeout" : "unavailable",
        operation,
        null,
        error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async createInactiveSubscriber(emailNormalized: string): Promise<{ id: string }> {
    const response = await this.request("create-subscriber", "/subscribers", "POST", {
      email_address: emailNormalized,
      state: "inactive",
    });
    const result = kitSubscriberResponseSchema.safeParse(response.data);
    // Existing subscribers retain their state on upsert. Never treat an existing
    // active/cancelled record as the start of a fresh double opt-in.
    if (!result.success)
      throw new KitClientError(
        "invalid-response",
        "create-subscriber",
        response.httpStatus,
        "invalid-response",
      );
    if (result.data.subscriber.state !== "inactive")
      throw new KitOptInRequiredError(
        result.data.subscriber.id,
        result.data.subscriber.state,
        response.httpStatus,
      );
    return { id: result.data.subscriber.id };
  }

  async associateSubscriberWithForm(subscriberId: string, referrer: string): Promise<void> {
    const response = await this.request(
      "associate-form",
      `/forms/${encodeURIComponent(this.formId)}/subscribers/${encodeURIComponent(subscriberId)}`,
      "POST",
      { referrer },
    );
    const result = kitSubscriberResponseSchema.safeParse(response.data);
    if (!result.success)
      throw new KitClientError(
        "invalid-response",
        "associate-form",
        response.httpStatus,
        "invalid-response",
      );
  }

  async getSubscriber(subscriberId: string) {
    const schema = z.object({
      subscriber: z.object({
        id: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).transform(String),
        email_address: z.string().trim().toLowerCase().pipe(z.email()),
        state: z.enum(["active", "inactive", "cancelled", "bounced", "complained"]),
      }),
    });
    const response = await this.request(
      "get-subscriber",
      `/subscribers/${encodeURIComponent(subscriberId)}`,
      "GET",
    );
    const result = schema.safeParse(response.data);
    if (!result.success || result.data.subscriber.id !== subscriberId)
      throw new KitClientError(
        "invalid-response",
        "get-subscriber",
        response.httpStatus,
        "invalid-response",
      );
    return result.data.subscriber;
  }
}
