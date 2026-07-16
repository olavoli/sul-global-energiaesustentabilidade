import { z } from "zod";

import { sha256 } from "../../../scripts/newsroom/storage/sha256";
import { storageAdapter } from "../../../scripts/newsroom/storage/runtime";

const SESSION_SECONDS = 8 * 60 * 60;
const sessionSchema = z.object({
  id: z.string().min(32),
  actor: z.string().trim().min(2).max(80),
  csrf: z.string().min(16),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
  revokedAt: z.number().int().optional(),
});

export type AdminSession = z.infer<typeof sessionSchema>;

function base64Url(value: Uint8Array): string {
  let binary = "";
  value.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sessionId(token: string, secret: string): Promise<string> {
  return sha256(`${secret}:${token}`);
}

export async function secureEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);
  let difference = leftHash.length ^ rightHash.length;
  for (let index = 0; index < Math.max(leftHash.length, rightHash.length); index += 1)
    difference |= (leftHash.charCodeAt(index) || 0) ^ (rightHash.charCodeAt(index) || 0);
  return difference === 0;
}

export async function createSessionToken(
  secret: string,
  actor: string,
  now = new Date(),
): Promise<{ token: string; session: AdminSession }> {
  const token = randomToken(32);
  const session = sessionSchema.parse({
    id: await sessionId(token, secret),
    actor,
    csrf: randomToken(24),
    issuedAt: now.valueOf(),
    expiresAt: now.valueOf() + SESSION_SECONDS * 1_000,
  });
  await storageAdapter().createSession(session);
  return { token, session };
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = new Date(),
): Promise<AdminSession | undefined> {
  if (!token || token.length > 100) return undefined;
  const stored = await storageAdapter().getSession(await sessionId(token, secret));
  if (!stored) return undefined;
  const session = sessionSchema.safeParse(stored);
  return session.success && !session.data.revokedAt && session.data.expiresAt > now.valueOf()
    ? session.data
    : undefined;
}

export async function revokeSession(session: AdminSession, now = Date.now()): Promise<void> {
  await storageAdapter().revokeSession(session.id, now);
}

export function cookieName(production: boolean): string {
  return production ? "__Host-newsroom_admin" : "newsroom_admin";
}

export function sessionCookie(token: string, production: boolean): string {
  return [
    `${cookieName(production)}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_SECONDS}`,
    ...(production ? ["Secure"] : []),
  ].join("; ");
}

export function expiredSessionCookie(production: boolean): string {
  return `${cookieName(production)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${
    production ? "; Secure" : ""
  }`;
}

export function cookieValue(header: string | null, name: string): string | undefined {
  return header
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)
    ?.slice(1)
    .join("=");
}
