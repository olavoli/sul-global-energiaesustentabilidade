import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Reuse the isolated preview and four existing viewports; no production route or baseline approval.
export default defineConfig({
  ...base,
  testMatch: "**/power.review.ts",
  outputDir: "./test-results/visual/power",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/power", open: "never" }]],
  use: { ...base.use, baseURL: "http://127.0.0.1:8094" },
  webServer: {
    command: "bun run preview:i18n",
    env: { I18N_PREVIEW_ORIGINAL: "o-que-e-potencia", I18N_PREVIEW_PORT: "8094" },
    url: "http://127.0.0.1:8094/__review-health",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
