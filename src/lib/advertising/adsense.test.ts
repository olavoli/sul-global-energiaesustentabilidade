import { expect, test } from "bun:test";
import { adsenseHeadScripts, ADSENSE_PUBLISHER_ID, ADSENSE_SCRIPT_URL } from "./adsense";
import { contentSecurityPolicy } from "../security-headers";

test("official head contains exactly the supplied asynchronous publisher script", () => {
  expect(ADSENSE_PUBLISHER_ID).toBe("ca-pub-2626435516434249");
  expect(adsenseHeadScripts(true)).toEqual([
    {
      src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2626435516434249",
      async: true,
      crossOrigin: "anonymous",
    },
  ]);
  expect(adsenseHeadScripts(true)[0].src).toBe(ADSENSE_SCRIPT_URL);
});
test("preview and test head never dispatch AdSense requests", () => {
  expect(adsenseHeadScripts(false)).toEqual([]);
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
