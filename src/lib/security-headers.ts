import { environmentConfig } from "@/config/environment";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https://images.unsplash.com",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
];

export function contentSecurityPolicy(officialProduction = false): string {
  return [...CSP_DIRECTIVES, ...(officialProduction ? ["upgrade-insecure-requests"] : [])].join(
    "; ",
  );
}

/** Apply defense-in-depth headers to SSR, assets and distribution endpoints. */
export function applySecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Security-Policy",
    contentSecurityPolicy(environmentConfig.isOfficialProduction),
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("X-Frame-Options", "DENY");
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
