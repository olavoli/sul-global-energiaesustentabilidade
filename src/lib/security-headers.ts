import { environmentConfig } from "@/config/environment";
import { ADSTERRA_FRAME_CSP, ADSTERRA_FRAME_PATH } from "./advertising/adsterra";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https://images.unsplash.com",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "manifest-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
];

export function contentSecurityPolicy(officialProduction = false, allowAdFrame = false): string {
  const directives = CSP_DIRECTIVES.map((directive) =>
    allowAdFrame && directive.startsWith("frame-src ") ? `${directive} 'self'` : directive,
  );
  return [...directives, ...(officialProduction ? ["upgrade-insecure-requests"] : [])].join("; ");
}

/** Apply defense-in-depth headers to SSR, assets and distribution endpoints. */
export function applySecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  const pathname = new URL(request.url).pathname;
  const adFrame = pathname === ADSTERRA_FRAME_PATH;
  headers.set(
    "Content-Security-Policy",
    adFrame
      ? ADSTERRA_FRAME_CSP
      : contentSecurityPolicy(
          environmentConfig.isOfficialProduction,
          /^\/artigo\/[^/]+\/?$/.test(pathname),
        ),
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("X-Frame-Options", adFrame ? "SAMEORIGIN" : "DENY");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (!environmentConfig.indexingEnabled) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (environmentConfig.isOfficialProduction && new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  } else {
    headers.delete("Strict-Transport-Security");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
