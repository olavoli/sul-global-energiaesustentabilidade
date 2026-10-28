import { test, expect } from "@playwright/test";
const paths = {
  "pt-BR": "/artigo/o-que-e-potencia",
  en: "/en/article/o-que-e-potencia",
  es: "/es/articulo/o-que-e-potencia",
};
for (const [locale, path] of Object.entries(paths)) {
  test(`${locale}: power draft comparison, geometry, equations and navigation`, async ({
    page,
  }, info) => {
    const errors: string[] = [],
      external: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/*", (route) => {
      if (!["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname)) {
        external.push(new URL(route.request().url()).origin);
        return route.abort();
      }
      return route.continue();
    });
    await page.clock.setFixedTime(new Date("2026-10-28T15:00:00Z"));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(response?.headers()["cache-control"]).toBe("no-store");
    await expect(page.locator("article")).toHaveAttribute("lang", locale);
    await expect(page.locator("article h1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("footer")).toHaveAttribute("lang", "pt-BR");
    const edition = page.locator("footer p[lang]");
    const editionLabel =
      locale === "en"
        ? "English edition."
        : locale === "es"
          ? "Edición en español."
          : "Publicado em português brasileiro.";
    await expect(edition).toHaveAttribute("lang", locale);
    await expect(edition).toHaveText(editionLabel);
    if (locale !== "pt-BR") {
      await expect(page.locator("footer")).not.toContainText("Publicado em português brasileiro.");
      await expect(page.locator('footer a[href="/rss.xml"]')).toHaveText(
        locale === "en" ? "RSS (Portuguese)" : "RSS (portugués)",
      );
    }
    await expect(
      page.getByRole("heading", {
        name: locale === "en" ? "References" : locale === "es" ? "Referencias" : "Referências",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(page.locator("article figcaption")).toHaveCount(2);
    for (const image of await page.locator("article img").all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element) => (element as HTMLImageElement).decode());
      const dimensions = await image.evaluate((element) => {
        const img = element as HTMLImageElement;
        return {
          naturalRatio: img.naturalWidth / img.naturalHeight,
          boxRatio: img.clientWidth / img.clientHeight,
          alt: img.alt,
        };
      });
      expect(dimensions.alt.length).toBeGreaterThan(10);
      expect(Math.abs(dimensions.naturalRatio - dimensions.boxRatio)).toBeLessThan(0.02);
    }
    for (const formula of [
      "P = ΔE / Δt",
      "1 W = 1 J/s",
      "E = P × t",
      locale === "en" ? "1 kWh = 3.6 MJ" : "1 kWh = 3,6 MJ",
    ])
      await expect(page.getByText(formula, { exact: true })).toBeVisible();
    await expect(page.locator("#ai-transparency-title")).toHaveCount(1);
    if (locale !== "pt-BR") {
      const note = page.locator("#ai-transparency-title").locator("..");
      await expect(note).toContainText("Cloudflare Workers AI (Meta Llama 3.3 70B)");
      await expect(note).toContainText(
        locale === "en"
          ? "Human editorial review is pending"
          : "La revisión editorial humana está pendiente",
      );
      await expect(note).toContainText(
        locale === "en" ? "not approved for publication" : "no está aprobado para publicación",
      );
      for (const slug of ["o-que-e-energia", "por-que-nenhuma-maquina-e-100-eficiente"]) {
        const links = page.locator(`article a[href="/artigo/${slug}"]`);
        expect(await links.count()).toBeGreaterThan(0);
        for (const link of await links.all())
          await expect(link).toContainText(locale === "en" ? "in Portuguese" : "en portugués");
      }
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const geometry = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      titleHeight: document.querySelector("article h1")?.getBoundingClientRect().height,
      pageHeight: document.documentElement.scrollHeight,
      overflow: [
        ...document.querySelectorAll(
          "header, article, article p, article h1, article h2, article figure, article figcaption, article li, footer",
        ),
      ]
        .filter((node) => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const breadcrumbEllipsis =
            node.matches('nav[aria-label="Navegação estrutural"] li[aria-current="page"]') &&
            node.textContent === document.querySelector("article h1")?.textContent &&
            style.textOverflow === "ellipsis" &&
            style.overflowX === "hidden" &&
            style.whiteSpace === "nowrap";
          return (
            box.width > 0 &&
            (box.left < -1 ||
              box.right > innerWidth + 1 ||
              (node.scrollWidth > node.clientWidth + 1 && !breadcrumbEllipsis))
          );
        })
        .map((node) => ({ tag: node.tagName, text: node.textContent?.slice(0, 100) })),
    }));
    await info.attach(`${locale}-geometry`, {
      body: JSON.stringify(geometry, null, 2),
      contentType: "application/json",
    });
    expect(geometry.width).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(geometry.overflow).toEqual([]);
    const capture = async (part: string, fullPage = false) => {
      const file = info.outputPath(`${locale}-${part}-NOT-APPROVED.png`);
      await page.screenshot({ path: file, fullPage, animations: "disabled" });
      await info.attach(`${locale}-${part}-NOT-APPROVED`, { path: file, contentType: "image/png" });
    };
    await capture("full", true);
    await capture("header");
    await page.getByText("P = ΔE / Δt", { exact: true }).scrollIntoViewIfNeeded();
    await capture("equations");
    await page.locator("#ai-transparency-title").scrollIntoViewIfNeeded();
    await capture("transparency");
    await edition.scrollIntoViewIfNeeded();
    await capture("edition-language");
    await page.evaluate(() => window.scrollTo(0, 0));
    const summary = page.locator("header summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("navigation", { name: "Language / Idioma" });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    if (!box) throw new Error("Language menu not rendered");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
    await capture("language-menu");
    await page.keyboard.press("Enter");
    for (const [language, destination] of Object.entries(paths)) {
      if (info.project.use.hasTouch) await summary.tap();
      else await summary.click();
      const link = page
        .getByRole("navigation", { name: "Language / Idioma" })
        .locator(`a[hreflang="${language}"]`);
      await expect(link).toHaveAttribute("href", destination);
      if (info.project.use.hasTouch) await link.tap();
      else await link.click();
      await expect(page).toHaveURL(new RegExp(destination + "$"));
      await expect(page.locator("article")).toHaveAttribute("lang", language);
      await expect(edition).toHaveAttribute("lang", language);
      await expect(edition).toHaveText(
        language === "en"
          ? "English edition."
          : language === "es"
            ? "Edición en español."
            : "Publicado em português brasileiro.",
      );
    }
    expect(await page.locator("iframe").count()).toBe(0);
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    info.annotations.push({
      type: "human-approval-pending",
      description: "Comparable review captures only; no approved baseline or editorial approval.",
    });
  });
}
