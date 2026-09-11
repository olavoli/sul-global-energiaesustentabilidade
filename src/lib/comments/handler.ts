import { getArticleBySlug } from "@/content/repository";
import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";
import { publicCommentInputSchema } from "./contracts";
import { D1PublicCommentRepository } from "./repository";

type CommentsEnvironment = {
  COMMENTS_ENABLED?: string;
  COMMENTS_HASH_SECRET?: string;
  NEWSROOM_DB?: D1Database;
};

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_SUBMISSIONS = 5;

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
    const page = await repository.listApprovedComments(articleSlug, {
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 20),
    });
    return json(page);
  }
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const secret = env.COMMENTS_HASH_SECRET?.trim();
  if (!secret) return json({ error: "Comentários indisponíveis." }, 503);
  if (!(await submissionAllowed(env.NEWSROOM_DB, request, secret)))
    return json({ error: "Tente novamente mais tarde." }, 429);
  const payload = await request.json();
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
  await repository.createPendingComment({
    articleSlug,
    publicName: parsed.data.publicName,
    emailNormalized: parsed.data.email,
    emailHash: await hmacCommentEmail(parsed.data.email, secret),
    bodyText: parsed.data.bodyText,
  });
  return json({ received: true }, 202);
}
