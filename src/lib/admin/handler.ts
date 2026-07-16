import { environmentConfig } from "@/config/environment";
import { reportError, reportWarning } from "@/lib/observability";
import { configureStorage } from "../../../scripts/newsroom/storage/runtime";
import {
  StorageConfigurationError,
  StorageConflictError,
} from "../../../scripts/newsroom/storage/errors";
import { executeAdminAction } from "./actions";
import {
  cookieName,
  cookieValue,
  createSessionToken,
  expiredSessionCookie,
  revokeSession,
  secureEqual,
  sessionCookie,
  verifySessionToken,
  type AdminSession,
} from "./auth";
import {
  adminActionSchema,
  adminSectionSchema,
  loginSchema,
  validAdminResourceId,
} from "./contracts";
import { detailData, sectionData } from "./data";
import {
  clearLoginFailures,
  loginAllowed,
  mutationAllowed,
  rateLimitKey,
  recordFailedLogin,
} from "./rate-limit";

type ServerEnvironment = Record<string, string | undefined>;

function environmentRecord(input: unknown): ServerEnvironment {
  const record: ServerEnvironment = {};
  if (input && typeof input === "object") {
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") record[key] = value;
    }
  }
  if (typeof process !== "undefined") {
    for (const key of [
      "NEWSROOM_ADMIN_SECRET",
      "NEWSROOM_ADMIN_LOCAL",
      "NEWSROOM_ENABLED",
      "NEWSROOM_COLLECTION_ENABLED",
      "NEWSROOM_TRANSLATION_ENABLED",
      "NEWSROOM_ORCHESTRATION_ENABLED",
      "NEWSROOM_NOTIFICATIONS_ENABLED",
      "NEWSROOM_SCHEDULE_ENABLED",
    ]) {
      record[key] ??= process.env[key];
    }
  }
  return record;
}

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
      ...headers,
    },
  });
}

function redirect(location: string, headers?: HeadersInit): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
      ...headers,
    },
  });
}

async function body(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("Formato de requisição inválido.");
  return request.json();
}

function adminSecret(environment: ServerEnvironment): string | undefined {
  const value = environment.NEWSROOM_ADMIN_SECRET?.trim();
  return value || undefined;
}

async function sessionFor(
  request: Request,
  secret: string,
  production: boolean,
): Promise<AdminSession | undefined> {
  const token = cookieValue(request.headers.get("cookie"), cookieName(production));
  return verifySessionToken(token, secret);
}

async function login(request: Request, environment: ServerEnvironment): Promise<Response> {
  const production = environmentConfig.isOfficialProduction;
  const secret = adminSecret(environment);
  if (!secret) return json({ error: "Central Editorial indisponível." }, 503);
  const key = await rateLimitKey(request);
  if (!(await loginAllowed(key)))
    return json({ error: "Acesso temporariamente indisponível." }, 429);
  const input = loginSchema.parse(await body(request));
  if (!(await secureEqual(input.secret, secret))) {
    await recordFailedLogin(key);
    reportWarning("Tentativa administrativa recusada.", { area: "admin-login" });
    return json({ error: "Não foi possível autenticar." }, 401);
  }
  await clearLoginFailures(key);
  const created = await createSessionToken(secret, input.actor);
  return json(
    { authenticated: true, actor: created.session.actor, csrf: created.session.csrf },
    200,
    { "set-cookie": sessionCookie(created.token, production) },
  );
}

async function api(
  request: Request,
  pathname: string,
  environment: ServerEnvironment,
  session: AdminSession,
): Promise<Response> {
  if (pathname === "/api/admin/session")
    return json({ actor: session.actor, csrf: session.csrf, expiresAt: session.expiresAt });
  if (pathname === "/api/admin/logout" && request.method === "POST") {
    const csrf = request.headers.get("x-csrf-token");
    if (!csrf || !(await secureEqual(csrf, session.csrf)))
      return json({ error: "Requisição não autorizada." }, 403);
    await revokeSession(session);
    return json({ authenticated: false }, 200, {
      "set-cookie": expiredSessionCookie(environmentConfig.isOfficialProduction),
    });
  }
  if (pathname === "/api/admin/actions" && request.method === "POST") {
    const csrf = request.headers.get("x-csrf-token");
    if (!csrf || !(await secureEqual(csrf, session.csrf)))
      return json({ error: "Requisição não autorizada." }, 403);
    if (!(await mutationAllowed(session.actor, request)))
      return json({ error: "Limite temporário de ações atingido." }, 429);
    const action = adminActionSchema.parse(await body(request));
    if (!(await secureEqual(action.actor, session.actor)))
      return json({ error: "Ator da sessão não confere." }, 403);
    return json({
      ok: true,
      result: await executeAdminAction({
        ...action,
        requestId: request.headers.get("cf-ray") ?? crypto.randomUUID(),
      }),
    });
  }
  if (request.method !== "GET") return json({ error: "Método não permitido." }, 405);
  const parts = pathname.split("/").filter(Boolean).slice(2);
  const section = adminSectionSchema.safeParse(parts[0] ?? "dashboard");
  if (!section.success) return json({ error: "Recurso não encontrado." }, 404);
  const id = parts[1];
  if (!id) return json({ data: await sectionData(section.data, environment) });
  if (!validAdminResourceId(section.data, id))
    return json({ error: "Identificador inválido." }, 400);
  const detail = await detailData(section.data, id);
  return detail ? json({ data: detail }) : json({ error: "Registro não encontrado." }, 404);
}

export async function handleAdminRequest(
  request: Request,
  runtimeEnvironment: unknown,
): Promise<Response | undefined> {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) return undefined;
  const environment = environmentRecord(runtimeEnvironment);
  try {
    configureStorage(runtimeEnvironment);
    if (pathname === "/api/admin/login" && request.method === "POST")
      return login(request, environment);
    const secret = adminSecret(environment);
    const production = environmentConfig.isOfficialProduction;
    if (!secret) {
      if (pathname.startsWith("/api/"))
        return json({ error: "Central Editorial indisponível." }, 503);
      return pathname === "/admin/login" ? undefined : redirect("/admin/login?unavailable=true");
    }
    const session = await sessionFor(request, secret, production);
    if (pathname === "/admin/login") return session ? redirect("/admin/newsroom") : undefined;
    if (!session) {
      return pathname.startsWith("/api/")
        ? json({ error: "Autenticação necessária." }, 401)
        : redirect("/admin/login");
    }
    if (pathname.startsWith("/api/admin"))
      return await api(request, pathname, environment, session);
    if (pathname === "/admin") return redirect("/admin/newsroom");
    return undefined;
  } catch (error) {
    reportError(error, { area: "admin-request", path: pathname });
    if (error instanceof StorageConflictError)
      return json({ error: "O registro mudou; recarregue antes de tentar novamente." }, 409);
    if (error instanceof StorageConfigurationError)
      return json({ error: "Persistência editorial indisponível." }, 503);
    return json({ error: "Não foi possível concluir a operação." }, 400);
  }
}
