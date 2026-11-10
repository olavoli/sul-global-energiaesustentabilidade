import { expect, test } from "bun:test";
import {
  adsenseHeadScripts,
  isAdsenseEditorialPage,
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SCRIPT_URL,
} from "./adsense";
import { contentSecurityPolicy } from "../security-headers";

test("official head contains exactly the supplied asynchronous publisher script", () => {
  expect(ADSENSE_PUBLISHER_ID).toBe("ca-pub-2626435516434249");
  expect(adsenseHeadScripts(true, true)).toEqual([
    {
      src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2626435516434249",
      async: true,
      crossOrigin: "anonymous",
    },
  ]);
  expect(adsenseHeadScripts(true, true)[0].src).toBe(ADSENSE_SCRIPT_URL);
});
test("preview and test head never dispatch AdSense requests", () => {
  expect(adsenseHeadScripts(false, true)).toEqual([]);
  expect(contentSecurityPolicy(false)).not.toContain("googlesyndication");
});
test("identification script permission is restricted to its HTTPS origin in production", () => {
  const policy = contentSecurityPolicy(true);
  expect(policy).toContain("https://pagead2.googlesyndication.com");
  expect(policy).not.toContain("*");
  expect(policy).not.toContain("unsafe-eval");
  expect(policy).not.toMatch(/(?:^|[ ;])https:(?:[ ;]|$)/);
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
});

test("technical bootstrap origins are scoped to their observed resource directives", () => {
  const rows = Object.fromEntries(
    contentSecurityPolicy(true)
      .split("; ")
      .map((d) => [d.split(" ")[0], d]),
  );
  expect(rows["frame-src"]).toContain("https://googleads.g.doubleclick.net");
  expect(rows["connect-src"]).toContain("https://ep1.adtrafficquality.google");
  expect(rows["img-src"]).toContain("https://ep1.adtrafficquality.google");
  expect(rows["script-src"]).toContain("https://ep2.adtrafficquality.google");
  expect(rows["script-src"]).not.toContain("https://ep1.adtrafficquality.google");
  expect(rows["script-src"]).not.toContain("doubleclick.net");
  expect(contentSecurityPolicy(false)).not.toContain("adtrafficquality.google");
  expect(contentSecurityPolicy(true, true)).toContain("https://www.google.com 'self'");
  expect(rows["frame-src"]).toContain("https://ep2.adtrafficquality.google");
  expect(rows["frame-src"]).toContain("https://www.google.com");
  expect(rows["script-src"]).not.toContain("https://www.google.com");
});

test("AdSense requires a successful page with editorial content", () => {
  const category = { routeId: "/categoria/$slug", status: "success" };
  expect(isAdsenseEditorialPage(200, [{ ...category, loaderData: { articles: [] } }], false)).toBe(
    false,
  );
  const populated = [{ ...category, loaderData: { articles: [{}] } }];
  expect(isAdsenseEditorialPage(200, populated, false)).toBe(true);
  expect(isAdsenseEditorialPage(404, populated, false)).toBe(false);
  expect(isAdsenseEditorialPage(500, populated, false)).toBe(false);
  expect(isAdsenseEditorialPage(200, [{ ...category, globalNotFound: true }], true)).toBe(false);
  expect(isAdsenseEditorialPage(200, [{ routeId: "/busca", status: "success" }], false)).toBe(
    false,
  );
  expect(adsenseHeadScripts(true, false)).toEqual([]);
});
