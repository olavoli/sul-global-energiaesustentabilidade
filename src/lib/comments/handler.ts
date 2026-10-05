import { getArticleBySlug } from "@/content/repository";
import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";
import { publicCommentInputSchema, reactionInputSchema, reportInputSchema } from "./contracts";
import { CommentTransitionError, D1PublicCommentRepository } from "./repository";
import { commentHmac, commentVisitor } from "./visitor";
import { commentRateAllowed } from "./rate-limit";

type CommentsEnvironment = {
  COMMENTS_ENABLED?: string;
  COMMENTS_HASH_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  NEWSROOM_DB?: D1Database;
};
export const hmacCommentEmail = commentHmac;
function json(value: unknown, status = 200, cookie?: string): Response {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
      ...(cookie ? { "set-cookie": cookie } : {}),
    },
  });
}

export async function turnstileAllowed(
  request: Request,
  token: string,
  secret: string,
  action = "comment-submit",
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
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
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    return (
      result.success === true &&
      result.hostname === new URL(request.url).hostname &&
      result.action === action
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function boundedPayload(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
  )
    throw new Error("Payload inválido.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Payload inválido.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        throw new Error("Payload excedente.");
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
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function handleCommentsRequest(
  request: Request,
  runtimeEnvironment: unknown,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const match = url.pathname.match(
    /^\/api\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\/comments(?:\/([a-zA-Z0-9_-]{1,128})\/(replies|reaction|reports))?$/,
  );
  if (!match) return undefined;
  const env = (runtimeEnvironment ?? {}) as CommentsEnvironment;
  if (env.COMMENTS_ENABLED !== "true") return json({ error: "Recurso não encontrado." }, 404);
  if (!env.NEWSROOM_DB || !env.COMMENTS_HASH_SECRET?.trim() || !env.TURNSTILE_SITE_KEY?.trim())
    return json({ error: "Comentários indisponíveis." }, 503);
  const [, articleSlug, id, operation] = match;
  if (!getArticleBySlug(articleSlug)) return json({ error: "Artigo não encontrado." }, 404);
  const method = request.method;
  const allowed =
    operation === "reaction"
      ? ["PUT", "DELETE"]
      : operation === "reports"
        ? ["POST"]
        : operation === "replies"
          ? ["GET"]
          : ["GET", "POST"];
  if (!allowed.includes(method)) return json({ error: "Método não permitido." }, 405);
  const secret = env.COMMENTS_HASH_SECRET.trim();
  const repository = new D1PublicCommentRepository(env.NEWSROOM_DB);
  try {
    if (method === "GET") {
      const visitor = await commentVisitor(request, secret, true);
      const options = {
        cursor: url.searchParams.get("cursor") ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? 20),
        visitorHash: visitor!.hash,
      };
      const page =
        operation === "replies"
          ? await repository.listReplies(articleSlug, id, options)
          : await repository.listApprovedComments(articleSlug, options);
      return json({ ...page, turnstileSiteKey: env.TURNSTILE_SITE_KEY }, 200, visitor?.cookie);
    }
    if (
      request.headers.get("origin") !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return json({ error: "Origem não autorizada." }, 403);
    const visitor = await commentVisitor(request, secret);
    if (operation && !visitor)
      return json({ error: "Recarregue os comentários antes de interagir." }, 403);
    const payload = method === "DELETE" ? undefined : await boundedPayload(request);
    if (operation === "reaction") {
      const parsed = method === "DELETE" ? null : reactionInputSchema.safeParse(payload);
      if (parsed && !parsed.success) return json({ error: "Reação inválida." }, 400);
      if (!(await commentRateAllowed(env.NEWSROOM_DB, request, secret, "reaction", visitor!.hash)))
        return json({ error: "Tente novamente mais tarde." }, 429);
      const comment = await repository.react(
        articleSlug,
        id,
        visitor!.hash,
        parsed?.success ? parsed.data.value : null,
      );
      return json({ comment });
    }
    const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
    if (!turnstileSecret) return json({ error: "Comentários indisponíveis." }, 503);
    if (operation === "reports") {
      const parsed = reportInputSchema.safeParse(payload);
      if (!parsed.success) return json({ error: "Denúncia inválida." }, 400);
      if (!(await commentRateAllowed(env.NEWSROOM_DB, request, secret, "report", visitor!.hash)))
        return json({ error: "Tente novamente mais tarde." }, 429);
      if (
        !(await turnstileAllowed(
          request,
          parsed.data.turnstileToken,
          turnstileSecret,
          "comment-report",
        ))
      )
        return json({ error: "Verificação de segurança inválida." }, 400);
      await repository.report(articleSlug, id, visitor!.hash, parsed.data);
      return json({ received: true }, 201);
    }
    if (
      payload &&
      typeof payload === "object" &&
      "honeypot" in payload &&
      typeof payload.honeypot === "string" &&
      payload.honeypot.length > 0
    )
      return json({ received: true }, 202);
    const parsed = publicCommentInputSchema.safeParse(payload);
    if (!parsed.success || parsed.data.articleSlug !== articleSlug)
      return json({ error: "Não foi possível receber o comentário." }, 400);
    if (!(await commentRateAllowed(env.NEWSROOM_DB, request, secret, "submit", visitor?.hash)))
      return json({ error: "Tente novamente mais tarde." }, 429);
    if (!(await turnstileAllowed(request, parsed.data.turnstileToken, turnstileSecret)))
      return json({ error: "Verificação de segurança inválida." }, 400);
    const comment = await repository.createPublishedComment({
      articleSlug,
      publicName: parsed.data.publicName,
      emailNormalized: parsed.data.email,
      emailHash: await commentHmac(parsed.data.email, secret),
      bodyText: parsed.data.bodyText,
      parentCommentId: parsed.data.parentCommentId,
    });
    return json({ comment }, 201);
  } catch (error) {
    if (error instanceof CommentTransitionError)
      return json({ error: "Comentário indisponível ou ação já registrada." }, 409);
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && /Payload|Cursor/.test(error.message))
    )
      return json({ error: "Requisição inválida." }, 400);
    return json({ error: "Comentários indisponíveis. Tente novamente." }, 503);
  }
}
