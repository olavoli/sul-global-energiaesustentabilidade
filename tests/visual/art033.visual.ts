import { checkHeader } from "./header-checks";
import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const paths = {
  "pt-BR": "/artigo/terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1",
  en: "/en/article/rare-earths-17-elements-technology-brazil-part-1",
  es: "/es/articulo/tierras-raras-17-elementos-tecnologia-brasil-parte-1",
};
for (const [locale, path] of Object.entries(paths)) {
  test(`${locale}: layout, navigation, console and review captures`, async ({ page }, info) => {
    const errors: string[] = [];
    const external: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
        external.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    await page.clock.setFixedTime(new Date("2026-10-25T15:00:00Z"));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.locator("article h1")).toBeVisible();
    await expect(page.locator("article figcaption")).toHaveCount(4);
    await expect(
      page.getByRole("region", {
        name: locale === "en" ? "Key takeaways" : locale === "es" ? "Puntos clave" : "Pontos-chave",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: locale === "en" ? "References" : locale === "es" ? "Referencias" : "Referências",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(page.locator("#ai-transparency-title")).toHaveCount(1);
    await expect(page.locator("article")).toHaveAttribute("lang", locale);
    for (const image of await page.locator("article img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty("complete", true);
      await image.evaluate((image) => (image as HTMLImageElement).decode());
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    // Measure the settled viewport after the lazy-image scroll traversal has painted.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const geometry = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      scrollNodes: [...document.querySelectorAll("body *")]
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => ({
          tag: element.tagName,
          text: element.textContent?.slice(0, 160),
          cls: element.getAttribute("class"),
          scroll: element.scrollWidth,
          client: element.clientWidth,
        })),
      overflowing: [...document.querySelectorAll("body *")]
        .filter((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.right > innerWidth + 1 || bounds.left < -1;
        })
        .slice(0, 50)
        .map((element) => ({
          tag: element.tagName,
          text: element.textContent?.slice(0, 160),
          className: element.getAttribute("class"),
          right: element.getBoundingClientRect().right,
        })),
    }));
    if (geometry.document > geometry.viewport + 1) {
      await info.attach("overflow-geometry", {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      await info.attach("overflow-full-page", {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }
    expect(geometry.document <= geometry.viewport + 1).toBe(true);
    // Long titles, body/figures and the footer must stay inside the horizontal viewport.
    const clipped = await page
      .locator("header, article h1, article figure, article .prose-editorial, footer")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const r = element.getBoundingClientRect();
            return r.left < -1 || r.right > innerWidth + 1;
          })
          .map((e) => e.tagName),
      );
    expect(clipped).toEqual([]);
    const controls = page.locator(
      "header summary, header a[aria-label='Buscar no portal'], header button[aria-label='Abrir menu']",
    );
    const boxes = await controls.evaluateAll((elements) =>
      elements
        .map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        })
        .filter((r) => r.w > 0 && r.h > 0),
    );
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const x = boxes[a],
          y = boxes[b];
        expect(
          x.x + x.w <= y.x + 1 ||
            y.x + y.w <= x.x + 1 ||
            x.y + x.h <= y.y + 1 ||
            y.y + y.h <= x.y + 1,
        ).toBe(true);
      }
    await checkHeader(page, locale);
    const shot = `${locale}.png`;
    const captured = await page.screenshot({ fullPage: true, animations: "disabled" });
    await info.attach(`${locale}-candidate-NOT-APPROVED`, {
      body: captured,
      contentType: "image/png",
    });
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(hrefs.every((href) => Boolean(href) && !/^(?:javascript:|undefined)/i.test(href))).toBe(
      true,
    );
    const approvalPath = resolve("tests/visual/baselines/approval.json");
    if (existsSync(approvalPath)) {
      const approval = JSON.parse(readFileSync(approvalPath, "utf8"));
      expect(approval.approvedBy).toBeTruthy();
      expect(approval.approvedAt).toBeTruthy();
      expect(approval.scope).toBe("ART-033 PT EN ES four viewports");
      await expect(page).toHaveScreenshot(shot, { fullPage: true, animations: "disabled" });
    } else {
      info.annotations.push({
        type: "baseline-pending",
        description:
          "Captures are candidates only; human approval absent; no visual regression approval claimed.",
      });
    }
    // Editions remain addressable directly; no replacement language control is introduced.
    for (const [lang, target] of Object.entries(paths)) {
      const response = await page.goto(target);
      expect(response?.status()).toBe(200);
      await expect(page.locator("article")).toHaveAttribute("lang", lang);
      await expect(page.locator('header [aria-label="Language / Idioma"]')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(await page.locator("iframe").count()).toBe(0);
  });
}
