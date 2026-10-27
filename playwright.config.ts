import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual",
  testMatch: "**/*.visual.ts",
  outputDir: "./test-results/visual",
  snapshotPathTemplate: "{testDir}/baselines/{projectName}/{arg}{ext}",
  updateSnapshots: "none",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8093",
    browserName: "chromium",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "light",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "narrow", use: { viewport: { width: 360, height: 800 }, hasTouch: true } },
  ],
  webServer: {
    command: "bun run preview:i18n",
    url: "http://127.0.0.1:8093/__review-health",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
