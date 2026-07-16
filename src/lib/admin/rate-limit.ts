import { sha256 } from "../../../scripts/newsroom/storage/sha256";
import { storageAdapter } from "../../../scripts/newsroom/storage/runtime";

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS = 5;
const MUTATION_WINDOW_MS = 60_000;
const MAX_MUTATIONS = 30;

export async function rateLimitKey(request: Request): Promise<string> {
  const identifier =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  return sha256(`admin-login:${identifier}`);
}

export async function loginAllowed(key: string, now = Date.now()): Promise<boolean> {
  const state = await storageAdapter().getRateLimit(key);
  const recent = (state?.attempts ?? []).filter((value) => now - value < WINDOW_MS);
  await storageAdapter().putRateLimit({ key, attempts: recent, expiresAt: now + WINDOW_MS });
  return recent.length < MAX_ATTEMPTS;
}

export async function recordFailedLogin(key: string, now = Date.now()): Promise<void> {
  const state = await storageAdapter().getRateLimit(key);
  const recent = (state?.attempts ?? []).filter((value) => now - value < WINDOW_MS);
  await storageAdapter().putRateLimit({
    key,
    attempts: [...recent, now],
    expiresAt: now + WINDOW_MS,
  });
}

export async function clearLoginFailures(key: string): Promise<void> {
  await storageAdapter().deleteRateLimit(key);
}

export async function mutationAllowed(
  actor: string,
  request: Request,
  now = Date.now(),
): Promise<boolean> {
  const origin = await rateLimitKey(request);
  const key = await sha256(`admin-mutation:${actor}:${origin}`);
  const state = await storageAdapter().getRateLimit(key);
  const recent = (state?.attempts ?? []).filter((value) => now - value < MUTATION_WINDOW_MS);
  await storageAdapter().putRateLimit({
    key,
    attempts: [...recent, now],
    expiresAt: now + MUTATION_WINDOW_MS,
  });
  return recent.length < MAX_MUTATIONS;
}

export async function resetRateLimits(): Promise<void> {
  return;
}
