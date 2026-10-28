import type { Transport } from "../i18n-real-pilot/adapters";
import { plan as translationPlan } from "./run";
import { test, expect } from "bun:test";
import { readFile, writeFile, mkdir, cp, symlink, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { setup, quota } from "./meaning-fixtures.test";
import { root, slug, credentials, mock } from "./automatic-fixtures.test";
import { runPolicyCycle } from "./policy-cycle";
import { parseEditorialFile } from "../../src/content/editorial-parser";
import { translationSchema } from "../../src/content/translation-schema";
import { generateTranslations } from "../generate-translations";
import { parse } from "yaml";
async function policySetup(fn: (dir: string) => Promise<void>) {
  await setup(async (dir) => {
    for (const path of ["content/translation-policies", "content/translation-evidence"])
      await cp(join(root, path), join(dir, path), { recursive: true });
    await fn(dir);
  });
}
async function publicCheckout(dir: string) {
  const files = spawnSync(
    "git",
    ["ls-files", "-z", "scripts", "src", "content", "tsconfig.json", "package.json"],
    { cwd: root, encoding: "utf8" },
  );
  if (files.status !== 0) throw Error("tracked-source-inventory-failed");
  for (const path of files.stdout.split("\0").filter(Boolean)) {
    await mkdir(join(dir, path, ".."), { recursive: true });
    await cp(join(root, path), join(dir, path));
  }
  await symlink(join(root, "node_modules"), join(dir, "node_modules"), "dir");
  await symlink(join(root, "public"), join(dir, "public"), "dir");
}
const noHTTP = async () => {
  throw Error("Unexpected HTTP in offline publication test");
};
test("cycle publishes existing validated drafts in simulation, isolates missing sources and skips CURRENT editions", () =>
  policySetup(async (dir) => {
    const opts = {
      simulation: true,
      credentials,
      freeQuota: quota,
      transport: noHTTP,
      persist: async () => {},
      articles: ["missing-source", slug],
    };
    const before = await readFile(join(dir, "content/articles", slug + ".mdx"), "utf8");
    const first = await runPolicyCycle(dir, opts);
    expect(first.some((r) => r.article === slug && r.state === "SIMULATED_PUBLICATION")).toBe(true);
    expect(first.some((r) => r.article === "missing-source" && r.state === "REVIEW_REQUIRED")).toBe(
      true,
    );
    const path = join(dir, "content/translations/en", slug + ".mdx"),
      published = await readFile(path, "utf8");
    const f = translationSchema.parse(parseEditorialFile(published).frontmatter);
    expect(f.translationReview.status).toBe("automatic");
    expect(f.translationReview.reviewer).toBeUndefined();
    expect((await runPolicyCycle(dir, { ...opts, articles: [slug] }))[0].state).toBe("CURRENT");
    expect(await readFile(path, "utf8")).toBe(published);
    expect(await readFile(join(dir, "content/articles", slug + ".mdx"), "utf8")).toBe(before);
  }));
test("hosted cycle refuses external execution without explicit enablement and verified history", () =>
  policySetup(async (dir) => {
    await expect(
      runPolicyCycle(dir, {
        simulation: false,
        credentials,
        freeQuota: quota,
        transport: noHTTP,
        persist: async () => {},
      }),
    ).rejects.toThrow("editorial-cycle-disabled");
    await expect(
      runPolicyCycle(dir, {
        simulation: false,
        externalEnabled: true,
        credentials,
        freeQuota: quota,
        transport: noHTTP,
        persist: async () => {},
      }),
    ).rejects.toThrow("automatic-history-anchor-mismatch");
  }));
test("disabled workflows select free-only, persist history and include only source-bound evidence in content diffs", async () => {
  const workflow = parse(
    await readFile(join(root, ".github/workflows/i18n-continuous.yml"), "utf8"),
  );
  expect(workflow.jobs.translate.if).toBe("vars.I18N_AUTOMATION_ENABLED == 'true'");
  const step = workflow.jobs.translate.steps.find(
    (s: { name?: string }) => s.name === "Translate with durable checkpoints",
  );
  expect(step.env.I18N_EXECUTION_MODE).toBe("free-only");
  expect(step.env.I18N_AUTO_ALLOW_PAID).toBeUndefined();
  expect(step.run).toContain("--editorial-policy");
  expect(step.if).toContain("steps.pending.outputs.blocked");
  expect(workflow.jobs.translate.steps.some((s: { id?: string }) => s.id === "pending")).toBe(true);
  expect(step.env.I18N_FREE_HISTORY_ANCHOR).toContain("secrets.");
  const production = await readFile(join(root, ".github/workflows/i18n-production.yml"), "utf8");
  expect(production).toContain("content/translation-evidence/en/*.json");
  expect(production).not.toContain("content/translation-policies/*.json");
  expect(production).toContain("conclusion == 'success'");
  expect(production).toContain("I18N_AUTOMATIC_DEPLOY_ENABLED == 'true'");
});
test("offline hosted selector never executes without --apply, even when an activation flag is set", () => {
  const result = spawnSync(
    process.execPath,
    ["run", "scripts/i18n-operations/automatic-cli.ts", "--editorial-policy"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        I18N_AUTOMATION_ENABLED: "true",
        I18N_EXECUTION_MODE: "free-only",
      },
    },
  );
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout).externalEnabled).toBe(false);
});
test("actual EN/ES policy publications pass the existing article and SEO regressions in an isolated checkout", () =>
  policySetup(async (dir) => {
    // Public tracked sources only; no .env, credentials, private state, caches or original Git directory.
    await publicCheckout(dir);
    const opts = {
      simulation: true,
      articles: [slug],
      credentials,
      freeQuota: quota,
      transport: noHTTP,
      persist: async () => {},
    };
    await runPolicyCycle(dir, opts);
    const originals = [];
    for (const name of await readdir(join(dir, "content/articles"))) {
      if (name.endsWith(".mdx")) {
        const path = join(dir, "content/articles", name);
        originals.push(parseEditorialFile(await readFile(path, "utf8"), path));
      }
    }
    await generateTranslations(originals, parseEditorialFile, false, dir);
    const result = spawnSync(
      process.execPath,
      ["test", "src/content/power-translations.test.tsx", "src/content/i18n.test.tsx"],
      { cwd: dir, encoding: "utf8", env: { PATH: process.env.PATH, CI: "true" } },
    );
    if (result.status !== 0)
      throw Error(
        "Published-state regressions failed:\n" + (result.stdout + result.stderr).slice(-9000),
      );
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("0 fail");
  }));

test("fresh mocked translations are staged once and resumed from private checkpoints under the daily quota", () =>
  policySetup(async (dir) => {
    // Remove only copies inside the mkdtemp fixture; originals/private operational state are never copied here.
    await rm(join(dir, "content/translations"), { recursive: true });
    await rm(join(dir, "content/translation-evidence"), { recursive: true });
    const expected = (await translationPlan(dir, slug)).calls.length,
      translated = mock();
    let calls = 0;
    const transport: Transport = async (url, init) => {
      calls++;
      const body = JSON.parse(String(init.body));
      if (body.messages[0].content.startsWith("Compare existing Portuguese")) {
        const pairs = JSON.parse(body.messages[1].content) as { id: string }[];
        return Response.json({
          success: true,
          result: {
            response: {
              findings: pairs.map((p) => ({
                id: p.id,
                outcome: "equivalent",
                rationale: "SYNTHETIC OFFLINE result, not linguistic certification.",
                resolvedSignals: [],
              })),
            },
            usage: { prompt_tokens: 10, completion_tokens: 10, neurons: 1 },
          },
        });
      }
      return translated.transport(url, init);
    };
    const opts = {
      simulation: true,
      articles: [slug],
      credentials,
      freeQuota: quota,
      transport,
      persist: async () => {},
    };
    let waiting = false;
    for (let i = 0; i < 4; i++) {
      const r = await runPolicyCycle(dir, opts);
      if (r.some((x) => x.state === "WAITING_QUOTA")) {
        waiting = true;
        break;
      }
    }
    expect(waiting).toBe(true);
    expect(translated.count()).toBe(expected);
    expect(calls).toBeLessThanOrEqual(7);
    const before = calls;
    await runPolicyCycle(dir, opts);
    expect(calls).toBe(before);
    for (const locale of ["en", "es"]) {
      const f = translationSchema.parse(
        parseEditorialFile(
          await readFile(join(dir, "content/translations", locale, slug + ".mdx"), "utf8"),
        ).frontmatter,
      );
      expect(f.status).toBe("draft");
      expect(f.translationReview.status).toBe("pending");
    }
  }));

test("standalone offline simulation and cost planner initialize without import cycles or credentials", () =>
  policySetup(async (dir) => {
    await publicCheckout(dir);
    for (const script of ["i18n:simulate", "i18n:pilot"]) {
      const r = spawnSync(process.execPath, ["run", script], {
        cwd: dir,
        encoding: "utf8",
        env: { PATH: process.env.PATH, CI: "true" },
      });
      if (r.status !== 0)
        throw Error(`Offline CLI ${script} failed: ` + (r.stdout + r.stderr).slice(-6000));
      expect(r.status).toBe(0);
    }
  }));
