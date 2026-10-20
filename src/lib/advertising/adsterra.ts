/** Public placement code supplied by the publisher, not an account credential. */
export const ADSTERRA_FRAME_PATH = "/_ads/adsterra-160x600.html";
export const ARTICLE_AD_MEDIA_QUERY = "(min-width: 1440px)";

export function hasArticleAdSpace(wide: boolean, left: number, viewportWidth: number): boolean {
  return wide && left >= 0 && left + 160 <= viewportWidth - 24;
}

export const ADSTERRA_FRAME_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'none'",
  "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
  "script-src 'unsafe-inline' https://bicea.org",
  // The vendor selects the creative's HTTPS frame origin, not the parent page.
  "frame-src https:",
  "style-src 'unsafe-inline'",
  "connect-src https://bicea.org",
].join("; ");

const ADSTERRA_FRAME_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=160, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Publicidade — Sul Global</title>
<style>html,body{margin:0;padding:0;width:160px;height:600px;overflow:hidden}iframe{border:0}</style>
</head><body>
<script>
  atOptions = {
    'key' : 'b5a35db3ccd7e9e06392b002636eb4d5',
    'format' : 'iframe',
    'height' : 600,
    'width' : 160,
    'params' : {}
  };
</script>
<script src="https://bicea.org/22/b5a35db3ccd7e9e06392b002636eb4d5"></script>
</body></html>`;

/** A presentation resource only: excluded from editorial routing and distribution. */
export function createAdsterraFrameResponse(request: Request): Response | undefined {
  if (new URL(request.url).pathname !== ADSTERRA_FRAME_PATH) return undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  return new Response(request.method === "HEAD" ? null : ADSTERRA_FRAME_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
