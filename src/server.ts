import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getPublishedArticles } from "./content/repository";
import { createDistributionResponse } from "./lib/distribution";
import { reportError } from "./lib/observability";
import { applySecurityHeaders } from "./lib/security-headers";
import { handleAdminRequest } from "./lib/admin/handler";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  reportError(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`), {
    area: "ssr-normalization",
  });
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const adminResponse = await handleAdminRequest(request, env);
      if (adminResponse) return applySecurityHeaders(adminResponse, request);
      const distributionResponse = createDistributionResponse(
        new URL(request.url).pathname,
        getPublishedArticles(),
      );
      if (distributionResponse) return applySecurityHeaders(distributionResponse, request);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return applySecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      reportError(error, { area: "server-fetch", path: new URL(request.url).pathname });
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
      );
    }
  },
};
