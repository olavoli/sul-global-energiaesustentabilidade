import { chromium } from "@playwright/test";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

// Review-only contact sheets from the three real screenshots, never approved baselines.
const root = resolve("test-results/visual/power");
const browser = await chromium.launch();
try {
  for (const [project, viewport] of [
    ["desktop", 1440],
    ["tablet", 768],
    ["mobile", 390],
    ["narrow", 360],
  ] as const) {
    const width = Math.min(viewport, 480);
    const folders = (await readdir(root)).filter((name) => name.endsWith(`-${project}`));
    const panels: string[] = [];
    for (const locale of ["pt-BR", "en", "es"]) {
      const file = `${locale}-header-NOT-APPROVED.png`;
      const folder = folders.find((name) => name.startsWith(`power.review.ts-${locale}-`));
      if (!folder) throw new Error(`Missing ${project}/${locale} comparison capture`);
      const image = (await readFile(join(root, folder, file))).toString("base64");
      panels.push(
        `<section><h2>${locale}</h2><img alt="${locale} actual review screenshot" src="data:image/png;base64,${image}"></section>`,
      );
    }
    const page = await browser.newPage({ viewport: { width: width * 3, height: 100 } });
    await page.route("**/*", (route) => route.abort());
    await page.setContent(
      `<html><head><style>body{margin:0;font-family:sans-serif}h1{font-size:16px;margin:12px}main{display:grid;grid-template-columns:repeat(3,1fr)}h2{font-size:14px;margin:8px}img{display:block;width:100%;height:auto}section{min-width:0}</style></head><body><h1>${project}: PT / EN / ES — capturas para revisão, NÃO APROVADAS</h1><main>${panels.join("")}</main></body></html>`,
    );
    await page
      .locator("img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
      );
    await mkdir(join(root, "comparisons"), { recursive: true });
    await page.screenshot({
      path: join(root, "comparisons", `${project}-PT-EN-ES.png`),
      fullPage: true,
    });
    await page.close();
    console.log(`${project}: three comparable screenshots assembled; not an editorial approval`);
  }
} finally {
  await browser.close();
}
