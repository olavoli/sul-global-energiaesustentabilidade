import { environmentConfig } from "../../config/environment";

export const ADSENSE_PUBLISHER_ID = "ca-pub-2626435516434249";
export const ADSENSE_SCRIPT_ORIGIN = "https://pagead2.googlesyndication.com";
export const ADSENSE_GOOGLE_FRAME_ORIGIN = "https://www.google.com";
export const ADSENSE_FRAME_ORIGIN = "https://googleads.g.doubleclick.net";
export const ADSENSE_MEASUREMENT_SCRIPT_ORIGIN = "https://ep2.adtrafficquality.google";
export const ADSENSE_CONNECT_ORIGIN = "https://ep1.adtrafficquality.google";
export const ADSENSE_SCRIPT_URL = `${ADSENSE_SCRIPT_ORIGIN}/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;

const collectionRoutes = new Set([
  "/autor/$slug",
  "/categoria/$slug",
  "/tag/$slug",
  "/en/category/$slug",
  "/en/tag/$slug",
  "/es/categoria/$slug",
  "/es/tema/$slug",
]);
const articleRoutes = new Set(["/artigo/$slug", "/en/article/$slug", "/es/articulo/$slug"]);

type EditorialMatch = {
  routeId: string;
  status: string;
  globalNotFound?: boolean;
  loaderData?: unknown;
};

export function isAdsenseEditorialPage(
  statusCode: number,
  matches: readonly EditorialMatch[],
  listingHasArticles: boolean,
): boolean {
  const page = matches.at(-1);
  if (
    statusCode !== 200 ||
    !page ||
    matches.some((match) => match.status !== "success" || match.globalNotFound)
  ) {
    return false;
  }
  if (articleRoutes.has(page.routeId)) return Boolean(page.loaderData);
  if (collectionRoutes.has(page.routeId)) {
    const data = page.loaderData as { articles?: readonly unknown[] } | undefined;
    return Boolean(data?.articles?.length);
  }
  return ["/", "/busca", "/$language"].includes(page.routeId) && listingHasArticles;
}

/** Potentially eligible routes are re-evaluated on a fresh document. */
export function canLoadAdsense(pathname: string): boolean {
  const path = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (["", "/busca", "/en", "/es"].includes(path)) return true;
  const routeId = path.slice(0, path.lastIndexOf("/")) + "/$slug";
  return articleRoutes.has(routeId) || collectionRoutes.has(routeId);
}

export function adsenseHeadScripts(officialProduction: boolean, eligible: boolean) {
  return officialProduction && eligible
    ? [{ src: ADSENSE_SCRIPT_URL, async: true, crossOrigin: "anonymous" as const }]
    : [];
}

export const adsenseEnabled = environmentConfig.isOfficialProduction;
