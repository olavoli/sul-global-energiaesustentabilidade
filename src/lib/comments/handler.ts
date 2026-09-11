import { getArticleBySlug } from "@/content/repository";
import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";
import { publicCommentInputSchema } from "./contracts";
import { D1PublicCommentRepository } from "./repository";

type CommentsEnvironment = {
  COMMENTS_ENABLED?: string;
  COMMENTS_HASH_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  NEWSROOM_DB?: D1Database;
};

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_SUBMISSIONS = 5;
const TURNSTILE_ACTION = "comment-submit";
const TURNSTILE_TIMEOUT_MS = 5_000;

function environment(input: unknown): CommentsEnvironment {
  return input && typeof input === "object" ? (input as CommentsEnvironment) : {};
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" },
  });
}

export async function hmacCommentEmail(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(email));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function submissionAllowed(
  database: D1Database,
  request: Request,
  secret: string,
): Promise<boolean> {
  const identifier = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = `comments:${await hmacCommentEmail(identifier, `${secret}:rate-limit`)}`;
  const now = Date.now();
  const row = await database
    .prepare("SELECT state_json FROM newsroom_rate_limits WHERE key=?1")
    .bind(key)
    .first<{ state_json: string }>();
  const attempts = row
    ? ((JSON.parse(row.state_json) as { attempts?: number[] }).attempts?.filter(
        (value) => now - value < WINDOW_MS,
      ) ?? [])
    : [];
  if (attempts.length >= MAX_SUBMISSIONS) return false;
  await database
    .prepare(
      `INSERT INTO newsroom_rate_limits (key,state_json,expires_at) VALUES (?1,?2,?3)
       ON CONFLICT(key) DO UPDATE SET state_json=?2,expires_at=?3`,
    )
    .bind(key, JSON.stringify({ attempts: [...attempts, now] }), now + WINDOW_MS)
    .run();
  return true;
}

type TurnstileResult = { success?: boolean; hostname?: string; action?: string };

export async function turnstileAllowed(
  request: Request,
  token: string,
  secret: string,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);
  try {
    const body = new URLSearchParams({ secret, response: token });
    const remoteIp = request.headers.get("cf-connecting-ip");
    if (remoteIp) body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const result = (await response.json()) as TurnstileResult;
    return (
      result.success === true &&
      result.hostname === new URL(request.url).hostname &&
      result.action === TURNSTILE_ACTION
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleCommentsRequest(
  request: Request,
  runtimeEnvironment: unknown,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\/comments$/);
  if (!match) return undefined;
  const env = environment(runtimeEnvironment);
  if (env.COMMENTS_ENABLED !== "true") return json({ error: "Recurso não encontrado." }, 404);
  if (!env.NEWSROOM_DB) return json({ error: "Comentários indisponíveis." }, 503);
  const articleSlug = match[1];
  if (!getArticleBySlug(articleSlug)) return json({ error: "Artigo não encontrado." }, 404);
  const repository = new D1PublicCommentRepository(env.NEWSROOM_DB);

  if (request.method === "GET") {
    const siteKey = env.TURNSTILE_SITE_KEY?.trim();
    if (!siteKey) return json({ error: "Comentários indisponíveis." }, 503);
    const page = await repository.listApprovedComments(articleSlug, {
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 20),
    });
    return json({ ...page, turnstileSiteKey: siteKey });
  }
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const secret = env.COMMENTS_HASH_SECRET?.trim();
  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !turnstileSecret) return json({ error: "Comentários indisponíveis." }, 503);
  const payload = await request.json().catch(() => undefined);
  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as { honeypot?: unknown }).honeypot === "string" &&
    (payload as { honeypot: string }).honeypot.length > 0
  )
    return json({ received: true }, 202);
  const parsed = publicCommentInputSchema.safeParse(payload);
  if (!parsed.success || parsed.data.articleSlug !== articleSlug)
    return json({ error: "Não foi possível receber o comentário." }, 400);
  if (!(await turnstileAllowed(request, parsed.data.turnstileToken, turnstileSecret)))
    return json({ error: "Não foi possível receber o comentário." }, 400);
  if (!(await submissionAllowed(env.NEWSROOM_DB, request, secret)))
    return json({ error: "Tente novamente mais tarde." }, 429);
  await repository.createPendingComment({
    articleSlug,
    publicName: parsed.data.publicName,
    emailNormalized: parsed.data.email,
    emailHash: await hmacCommentEmail(parsed.data.email, secret),
    bodyText: parsed.data.bodyText,
  });
  return json({ received: true }, 202);
}
