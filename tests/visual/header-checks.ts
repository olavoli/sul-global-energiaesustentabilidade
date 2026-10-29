import { expect, type Page } from "@playwright/test";

/** Check the actual global header after removal, preserving its remaining controls. */
export async function checkHeader(page: Page, locale: string) {
  const header = page.locator("header").first();
  await expect(header.locator('[aria-label="Language / Idioma"]')).toHaveCount(0);
  for (const message of [
    "tradução indisponível",
    "translation unavailable",
    "traducción no disponible",
  ])
    await expect(header).not.toContainText(message);
  await expect(
    header.getByRole("link", { name: "Sul Global Energia e Sustentabilidade — página inicial" }),
  ).toBeVisible();
  const search = header.getByRole("link", { name: "Buscar no portal" });
  await expect(search).toBeVisible();
  await expect(search).toHaveAttribute("href", locale === "pt-BR" ? "/busca" : `/${locale}`);
  const theme = header.getByRole("button", { name: /Ativar modo (claro|escuro)/ });
  await expect(theme).toBeVisible();
  const initial = await page.locator("html").evaluate((e) => e.classList.contains("dark"));
  await theme.focus();
  await expect(theme).toBeFocused();
  await page.keyboard.press("Enter");
  await expect
    .poll(() => page.locator("html").evaluate((e) => e.classList.contains("dark")))
    .toBe(!initial);
  await page.keyboard.press("Enter");
  await expect
    .poll(() => page.locator("html").evaluate((e) => e.classList.contains("dark")))
    .toBe(initial);
  const boxes = await header
    .locator('a[aria-label="Buscar no portal"], button[aria-label^="Ativar modo"]')
    .evaluateAll((elements) =>
      elements.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, height: r.height };
      }),
    );
  expect(boxes).toHaveLength(2);
  expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].x);
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes[0].height - boxes[1].height)).toBeLessThanOrEqual(1);
  const mobile = header.getByRole("button", { name: "Abrir menu" });
  if (await mobile.isVisible()) {
    await mobile.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#mobile-navigation-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-navigation-dialog")).not.toBeVisible();
    await expect(mobile).toBeFocused();
  }
}
