import { z } from "zod";
import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";
import { KitNewsletterClient } from "./kit-client";
import { D1NewsletterRepository } from "./repository";
import { newsletterEmailHash } from "./security";

const inputSchema = z.object({ cursor: z.string().max(128).default("") }).strict();

/** Called only after the administrative session, CSRF and rate-limit checks. */
export async function handleNewsletterSync(
  request: Request,
  runtimeEnvironment: unknown,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const json = (value: unknown, status = 200) =>
    Response.json(value, {
      status,
      headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" },
    });
  const env = runtimeEnvironment as {
    NEWSLETTER_ENABLED?: string;
    NEWSROOM_DB?: D1Database;
    KIT_API_KEY?: string;
    KIT_FORM_ID?: string;
    NEWSLETTER_HASH_SECRET?: string;
  };
  if (
    env?.NEWSLETTER_ENABLED !== "true" ||
    !env.NEWSROOM_DB ||
    !env.KIT_API_KEY?.trim() ||
    !/^\d+$/.test(env.KIT_FORM_ID?.trim() ?? "") ||
    !env.NEWSLETTER_HASH_SECRET?.trim()
  )
    return json({ error: "Newsletter indisponível." }, 503);
  let cursor: string;
  try {
    if (
      request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" ||
      Number(request.headers.get("content-length") ?? 0) > 512
    )
      return json({ error: "Payload inválido." }, 400);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Payload inválido." }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 512) {
          await reader.cancel();
          throw new Error("Payload inválido.");
        }
        chunks.push(value);
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
    cursor = inputSchema.parse(JSON.parse(new TextDecoder().decode(bytes))).cursor;
  } catch {
    return json({ error: "Payload inválido." }, 400);
  }
  const repository = new D1NewsletterRepository(env.NEWSROOM_DB);
  const client = new KitNewsletterClient(env.KIT_API_KEY.trim(), env.KIT_FORM_ID!.trim(), fetcher);
  let checked = 0;
  try {
    const candidates = await repository.syncCandidates(cursor, 11);
    for (const row of candidates.slice(0, 10)) {
      const subscriber = await client.getSubscriber(row.kit_subscriber_id);
      if (subscriber.email_address !== row.email_normalized) throw new Error("Identity mismatch.");
      const emailHash = await newsletterEmailHash(
        row.email_normalized,
        env.NEWSLETTER_HASH_SECRET.trim(),
      );
      const common = {
        eventId: `sync:${await newsletterEmailHash(`${row.id}:${row.consented_at}:${subscriber.state}`, env.NEWSLETTER_HASH_SECRET.trim())}`,
        occurredAt: new Date().toISOString(),
        kitSubscriberId: row.kit_subscriber_id,
        emailNormalized: row.email_normalized,
        emailHash,
        source: "kit-api-sync" as const,
        expectedConsent: row.consented_at,
      };
      // Only associated pending records have a verified inactive baseline and
      // explicit local consent. The public POST never invokes activate.
      if (subscriber.state === "active" && row.status === "pending")
        await repository.activate(common);
      else if (["cancelled", "bounced", "complained"].includes(subscriber.state))
        await repository.unsubscribe(common);
      checked += 1;
      cursor = row.id;
    }
    return json({ checked, cursor: candidates.length > 10 ? cursor : null });
  } catch {
    // Retry the failed row, without repeating successful state transitions.
    return json(
      {
        error: "Sincronização indisponível. Repita a partir do cursor retornado.",
        checked,
        cursor,
      },
      503,
    );
  }
}
