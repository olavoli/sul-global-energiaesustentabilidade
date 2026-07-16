import {
  assertSafeExternalUrl,
  MAX_RESPONSE_BYTES,
  readBoundedResponse,
  USER_AGENT,
} from "./security";

export type FeedFailureCode =
  | "network"
  | "http-error"
  | "too-large"
  | "invalid-content-type"
  | "suspicious-redirect"
  | "redirect-limit";

export class FeedTransportError extends Error {
  constructor(
    readonly code: FeedFailureCode,
    message: string,
    readonly metadata: {
      httpStatus?: number;
      contentType?: string;
      responseBytes?: number;
      finalUrl?: string;
    } = {},
  ) {
    super(message);
    this.name = "FeedTransportError";
  }
}

export type HttpTransport = (input: URL, init: RequestInit) => Promise<Response>;
export type UrlSafety = (input: string) => Promise<URL>;

export interface FeedResponse {
  status: 200 | 304;
  body?: string;
  finalUrl: string;
  redirects: number;
  contentType?: string;
  responseBytes: number;
  responseMs: number;
  etag?: string;
  lastModified?: string;
}

export interface FeedRequestOptions {
  transport?: HttpTransport;
  urlSafety?: UrlSafety;
  etag?: string;
  lastModified?: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

const defaultTransport: HttpTransport = (input, init) => fetch(input, init);

export async function requestFeed(
  input: string,
  options: FeedRequestOptions = {},
): Promise<FeedResponse> {
  const transport = options.transport ?? defaultTransport;
  const safety = options.urlSafety ?? assertSafeExternalUrl;
  const maxRedirects = options.maxRedirects ?? 3;
  const started = performance.now();
  let url = await safety(input);
  const originalHost = url.hostname;
  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    let response: Response;
    try {
      response = await transport(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
          ...(options.etag ? { "If-None-Match": options.etag } : {}),
          ...(options.lastModified ? { "If-Modified-Since": options.lastModified } : {}),
        },
        redirect: "manual",
        signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
      });
    } catch (error) {
      throw new FeedTransportError(
        "network",
        `Falha de rede: ${error instanceof Error ? error.message : String(error)}`,
        { finalUrl: url.toString() },
      );
    }
    const metadata = {
      httpStatus: response.status,
      contentType: response.headers.get("content-type") ?? undefined,
      finalUrl: url.toString(),
    };
    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      const location = response.headers.get("location");
      if (!location || redirects === maxRedirects) {
        throw new FeedTransportError(
          "redirect-limit",
          "Redirecionamento inválido ou excessivo.",
          metadata,
        );
      }
      const target = await safety(new URL(location, url).toString());
      if (target.hostname !== originalHost) {
        throw new FeedTransportError(
          "suspicious-redirect",
          "Redirecionamento alterou o domínio do feed.",
          {
            ...metadata,
            finalUrl: target.toString(),
          },
        );
      }
      url = target;
      continue;
    }
    const base = {
      finalUrl: url.toString(),
      redirects,
      contentType: metadata.contentType,
      responseMs: Math.max(0, performance.now() - started),
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    };
    if (response.status === 304) return { status: 304, responseBytes: 0, ...base };
    if (!response.ok) {
      throw new FeedTransportError(
        "http-error",
        `Feed respondeu HTTP ${response.status}.`,
        metadata,
      );
    }
    if (!/(rss|atom|xml)/i.test(metadata.contentType ?? "")) {
      throw new FeedTransportError(
        "invalid-content-type",
        "Content-Type incompatível com RSS/Atom.",
        metadata,
      );
    }
    let body: string;
    try {
      body = await readBoundedResponse(response, options.maxBytes ?? MAX_RESPONSE_BYTES);
    } catch (error) {
      throw new FeedTransportError("too-large", "Resposta excede o limite permitido.", metadata);
    }
    return {
      status: 200,
      body,
      responseBytes: new TextEncoder().encode(body).byteLength,
      ...base,
    };
  }
  throw new FeedTransportError("redirect-limit", "Redirecionamento excessivo.");
}
