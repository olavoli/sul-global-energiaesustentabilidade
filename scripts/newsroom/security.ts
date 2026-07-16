import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_RESPONSE_BYTES = 1_000_000;
export const USER_AGENT = "SulGlobalNewsroom/1.0 (+coleta-editorial-supervisionada)";

function isPrivateIpv4(value: string): boolean {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4) return false;
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    octets[0] === 0 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

export function isPrivateAddress(value: string): boolean {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, "");
  if (isPrivateIpv4(normalized)) return true;
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

export function validateExternalUrl(input: string): URL {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocolo não permitido.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || isPrivateAddress(host)) {
    throw new Error("Endereço local ou privado bloqueado.");
  }
  return url;
}

export async function assertSafeExternalUrl(input: string): Promise<URL> {
  const url = validateExternalUrl(input);
  if (isIP(url.hostname) === 0) {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new Error("DNS resolveu para endereço privado ou indisponível.");
    }
  }
  return url;
}

export async function readBoundedResponse(
  response: Response,
  limit = MAX_RESPONSE_BYTES,
): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > limit) throw new Error("Resposta excede o limite permitido.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Resposta excede o limite permitido.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function fetchFeed(
  urlInput: string,
  timeoutMs = 8_000,
  redirects = 3,
): Promise<string> {
  let url = await assertSafeExternalUrl(urlInput);
  for (let redirect = 0; redirect <= redirects; redirect += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === redirects)
        throw new Error("Redirecionamento inválido ou excessivo.");
      url = await assertSafeExternalUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Feed respondeu HTTP ${response.status}.`);
    const type = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!/(rss|atom|xml)/.test(type)) throw new Error("Content-Type não é RSS, Atom ou XML.");
    return readBoundedResponse(response);
  }
  throw new Error("Redirecionamento excessivo.");
}
