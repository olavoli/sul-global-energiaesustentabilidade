const COOKIE = "sges-comment-visitor";
const MAX_AGE = 180 * 24 * 60 * 60;

export async function commentHmac(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function commentVisitor(
  request: Request,
  secret: string,
  issue = false,
): Promise<
  | {
      hash: string;
      cookie?: string;
    }
  | undefined
> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const match = token?.match(/^([a-f0-9]{64})\.(\d{10})\.([a-f0-9]{64})$/);
  const now = Math.floor(Date.now() / 1000);
  if (
    match &&
    Number(match[2]) > now &&
    Number(match[2]) <= now + MAX_AGE &&
    equal(match[3], await commentHmac(`${match[1]}.${match[2]}`, `${secret}:visitor-signature`))
  ) {
    return { hash: await commentHmac(match[1], `${secret}:visitor-identity`) };
  }
  if (!issue) return undefined;
  const random = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const payload = `${random}.${now + MAX_AGE}`;
  const signature = await commentHmac(payload, `${secret}:visitor-signature`);
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const secure = url.protocol === "https:" || !local ? "; Secure" : "";
  return {
    hash: await commentHmac(random, `${secret}:visitor-identity`),
    cookie: `${COOKIE}=${payload}.${signature}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
  };
}
