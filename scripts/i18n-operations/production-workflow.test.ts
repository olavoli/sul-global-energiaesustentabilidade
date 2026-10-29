import { test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

test("automatic production receives a protected D1 identifier and read-only smoke configuration", async () => {
  const workflow = parse(await readFile(".github/workflows/i18n-production.yml", "utf8"));
  const steps = workflow.jobs.deploy.steps;
  const deployment = steps.find(
    (step: { name?: string }) =>
      step.name === "Official configuration, comparison, dry-run and deploy",
  );
  expect(deployment.env.PRODUCTION_D1_DATABASE_ID).toBe(
    "${{ secrets.I18N_PRODUCTION_D1_DATABASE_ID }}",
  );
  expect(deployment.run).toContain("bun run production:config");
  expect(deployment.run).toContain("bun run production:check");
  expect(deployment.run).toContain("bun run production:dry-run");
  expect(deployment.run).toContain("--keep-vars");
  const smoke = steps.find((step: { run?: string }) => step.run === "bun run smoke:production");
  expect(smoke.env).toEqual({
    PRODUCTION_BASE_URL: "https://sulglobalenergia.com.br",
    PRODUCTION_TARGET_CONFIRMATION: "PRODUCTION-READ-ONLY",
  });
  expect(workflow.jobs.deploy.environment).toBe("i18n-production");
  expect(workflow.jobs.deploy.if).toContain("I18N_AUTOMATION_ENABLED == 'true'");
  expect(workflow.jobs.deploy.if).toContain("I18N_AUTOMATIC_DEPLOY_ENABLED == 'true'");
});
