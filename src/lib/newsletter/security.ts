import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";

const encoder = new TextEncoder();

function ownedBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer;
}

async function hmacHex(value: Uint8Array, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    ownedBuffer(encoder.encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, ownedBuffer(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newsletterEmailHash(emailNormalized: string, secret: string): Promise<string> {
  return hmacHex(encoder.encode(emailNormalized), secret);
}

function constantTimeHexEqual(left: string, right: string): boolean {
  if (left.length !== right.length || !/^[0-9a-f]+$/i.test(left + right)) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyKitSignature(
  rawBody: Uint8Array,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): Promise<boolean> {
  const parts = (header ?? "").split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > 300)
    return false;
  const prefix = encoder.encode(`${timestamp}.`);
  const signed = new Uint8Array(prefix.length + rawBody.length);
  signed.set(prefix);
  signed.set(rawBody, prefix.length);
  const expected = await hmacHex(signed, secret);
  return parts
    .filter((part) => part.startsWith("v1="))
    .some((part) => constantTimeHexEqual(part.slice(3), expected));
}

export async function newsletterTurnstileAllowed(
  request: Request,
  token: string,
  secret: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const body = new URLSearchParams({ secret, response: token });
    const remoteIp = request.headers.get("cf-connecting-ip");
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    return (
      result.success === true &&
      result.hostname === new URL(request.url).hostname &&
      result.action === "newsletter-subscribe"
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function newsletterRateAllowed(
  database: D1Database,
  request: Request,
  secret: string,
): Promise<boolean> {
  const now = Date.now();
  const windowMs = 15 * 60_000;
  const identifier = await newsletterEmailHash(
    request.headers.get("cf-connecting-ip") ?? "unknown",
    `${secret}:rate-limit`,
  );
  const result = await database
    .prepare(
      `INSERT INTO newsroom_rate_limits (key,state_json,expires_at)
      VALUES (?1,json_object('attempts',json_array(?2)),?3)
      ON CONFLICT(key) DO UPDATE SET
        state_json=json_object('attempts',json((SELECT json_group_array(value) FROM (
          SELECT value FROM json_each(newsroom_rate_limits.state_json,'$.attempts') WHERE value>?4
          UNION ALL SELECT ?2)))), expires_at=?3
      WHERE (SELECT COUNT(*) FROM json_each(newsroom_rate_limits.state_json,'$.attempts') WHERE value>?4)<5`,
    )
    .bind(`newsletter:subscribe:${identifier}`, now, now + windowMs, now - windowMs)
    .run();
  return result.success && result.meta?.changes === 1;
}
