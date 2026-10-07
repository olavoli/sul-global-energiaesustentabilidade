import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";
import {
  kitWebhookEnvelopeSchema,
  parseKitSubscriberEvent,
  publicNewsletterSubscriptionSchema,
} from "./contracts";
import { KitNewsletterClient, KitOptInRequiredError } from "./kit-client";
import { D1NewsletterRepository } from "./repository";
import {
  newsletterEmailHash,
  newsletterRateAllowed,
  newsletterTurnstileAllowed,
  verifyKitSignature,
} from "./security";

type NewsletterEnvironment = {
  NEWSLETTER_ENABLED?: string;
  NEWSLETTER_HASH_SECRET?: string;
  KIT_API_KEY?: string;
  KIT_FORM_ID?: string;
  KIT_WEBHOOK_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  NEWSROOM_DB?: D1Database;
};

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

async function boundedBytes(request: Request, maximum: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid payload.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new Error("Payload too large.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function decodeJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function configured(env: NewsletterEnvironment): env is NewsletterEnvironment & {
  NEWSLETTER_HASH_SECRET: string;
  KIT_API_KEY: string;
  KIT_FORM_ID: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
  NEWSROOM_DB: D1Database;
} {
  return Boolean(
    env.NEWSROOM_DB &&
    env.NEWSLETTER_HASH_SECRET?.trim() &&
    env.KIT_API_KEY?.trim() &&
    /^\d+$/.test(env.KIT_FORM_ID?.trim() ?? "") &&
    env.TURNSTILE_SECRET_KEY?.trim() &&
    env.TURNSTILE_SITE_KEY?.trim(),
  );
}

export async function handleNewsletterRequest(
  request: Request,
  runtimeEnvironment: unknown,
  dependencies: {
    fetcher?: typeof fetch;
    nowSeconds?: number;
  } = {},
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const isSubscription = url.pathname === "/api/newsletter/subscriptions";
  const isWebhook = url.pathname === "/api/newsletter/webhooks/kit";
  if (!isSubscription && !isWebhook) return undefined;

  const env = (runtimeEnvironment ?? {}) as NewsletterEnvironment;
  const enabled = env.NEWSLETTER_ENABLED === "true";
  if (isSubscription && request.method === "GET")
    return json({
      enabled: enabled && configured(env),
      turnstileSiteKey: enabled && configured(env) ? env.TURNSTILE_SITE_KEY : "",
    });
  if (!enabled) return json({ error: "Newsletter indisponível no momento." }, 503);
  if (!configured(env)) return json({ error: "Newsletter indisponível no momento." }, 503);

  const repository = new D1NewsletterRepository(env.NEWSROOM_DB);
  const hashSecret = env.NEWSLETTER_HASH_SECRET.trim();
  if (isWebhook) {
    if (!env.KIT_WEBHOOK_SECRET?.trim()) return json({ error: "Recurso indisponível." }, 404);
    if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
    try {
      const rawBody = await boundedBytes(request, 600_000);
      if (
        !(await verifyKitSignature(
          rawBody,
          request.headers.get("x-kit-signature"),
          env.KIT_WEBHOOK_SECRET.trim(),
          dependencies.nowSeconds,
        ))
      )
        return json({ error: "Assinatura inválida." }, 401);
      const envelope = kitWebhookEnvelopeSchema.safeParse(decodeJson(rawBody));
      if (!envelope.success) return json({ error: "Payload inválido." }, 400);
      for (const event of envelope.data.events) {
        if (await repository.webhookProcessed(event.id)) continue;
        if (!["subscriber.activated", "subscriber.unsubscribed"].includes(event.type)) {
          await repository.recordWebhook(event.id, event.type, event.created);
          continue;
        }
        const subscriber = parseKitSubscriberEvent(event.data);
        if (!subscriber.success) return json({ error: "Payload inválido." }, 400);
        const emailNormalized = subscriber.data.subscriber.email_address;
        const common = {
          eventId: event.id,
          occurredAt: event.created,
          kitSubscriberId: subscriber.data.subscriber.id,
          emailNormalized,
          emailHash: await newsletterEmailHash(emailNormalized, hashSecret),
        };
        if (event.type === "subscriber.activated") {
          // Optional webhooks are hints, never an alternative to API evidence.
          const client = new KitNewsletterClient(
            env.KIT_API_KEY.trim(),
            env.KIT_FORM_ID.trim(),
            dependencies.fetcher,
          );
          const observed = await client.getSubscriber(common.kitSubscriberId);
          if (observed.email_address !== emailNormalized)
            return json({ error: "Payload inválido." }, 400);
          if (observed.state === "active") await repository.activate(common);
        } else await repository.unsubscribe(common);
      }
      return new Response(null, { status: 204 });
    } catch {
      return json({ error: "Webhook indisponível." }, 503);
    }
  }

  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (
    request.headers.get("origin") !== url.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json({ error: "Origem não autorizada." }, 403);
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
      return json({ error: "Não foi possível receber a inscrição." }, 400);
    const payload = decodeJson(await boundedBytes(request, 16_384));
    if (
      payload &&
      typeof payload === "object" &&
      "honeypot" in payload &&
      typeof payload.honeypot === "string" &&
      payload.honeypot.length > 0
    )
      return json({ accepted: true }, 202);
    const parsed = publicNewsletterSubscriptionSchema.safeParse(payload);
    if (!parsed.success) return json({ error: "Não foi possível receber a inscrição." }, 400);
    if (!(await newsletterRateAllowed(env.NEWSROOM_DB, request, hashSecret)))
      return json({ error: "Tente novamente mais tarde." }, 429);
    if (
      !(await newsletterTurnstileAllowed(
        request,
        parsed.data.turnstileToken,
        env.TURNSTILE_SECRET_KEY.trim(),
        dependencies.fetcher,
      ))
    )
      return json({ error: "Verificação de segurança inválida." }, 400);

    const emailHash = await newsletterEmailHash(parsed.data.email, hashSecret);
    const pending = await repository.preparePending({
      emailNormalized: parsed.data.email,
      emailHash,
      source: "newsletter-cta",
    });
    if (!pending.active && !pending.associated) {
      try {
        const client = new KitNewsletterClient(
          env.KIT_API_KEY.trim(),
          env.KIT_FORM_ID.trim(),
          dependencies.fetcher,
        );
        const subscriber = await client.createInactiveSubscriber(parsed.data.email);
        await repository.recordKitSubscriber(emailHash, subscriber.id);
        await client.associateSubscriberWithForm(subscriber.id, url.origin + "/newsletter");
        await repository.markAssociated(emailHash);
      } catch (error) {
        if (
          error instanceof KitOptInRequiredError &&
          ["cancelled", "bounced", "complained"].includes(error.state)
        ) {
          await repository.unsubscribe({
            eventId: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            kitSubscriberId: error.subscriberId,
            emailNormalized: parsed.data.email,
            emailHash,
            source: "kit-api-sync",
          });
        } else await repository.markSyncFailed(emailHash);
        return json(
          { error: "Não foi possível iniciar a confirmação. Tente novamente mais tarde." },
          503,
        );
      }
    }
    return json(
      { accepted: true, message: "Confira sua caixa de entrada para confirmar sua inscrição." },
      202,
    );
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && /Payload/.test(error.message)))
      return json({ error: "Não foi possível receber a inscrição." }, 400);
    return json({ error: "Newsletter indisponível no momento." }, 503);
  }
}
