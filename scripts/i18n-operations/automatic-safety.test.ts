import { publishedTranslations } from "../../src/content/i18n";
import { loadBook, append, replay } from "./ledger";
import { fingerprint } from "./policy";
import { translationSchema } from "../../src/content/translation-schema";
import { scientificTokensMatch } from "./automatic-science";
import { test, expect } from "bun:test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { temporary, policy, mock, deps, slug } from "./automatic-fixtures.test";
import { runAutomaticCycle } from "./automatic-cycle";
import { installCandidates } from "./automatic-publication";
import { generateTranslations } from "../generate-translations";
import { parseEditorialFile } from "../../src/content/editorial-parser";
import { continuousBudget } from "./automation-policy";
import { verifyModelAccess } from "./automatic-state";
import { parse } from "yaml";
test("pending identical publication can recover without replacing artifacts or paying again", () =>
  temporary(async (dir) => {
    const m = mock();
    const result = await runAutomaticCycle(dir, policy(), {
      ...deps(m.transport),
      publish: async (root, id, candidates) => {
        const path = join(root, "content/translations/en");
        await mkdir(path, { recursive: true });
        await writeFile(join(path, id + ".mdx.auto-pending"), candidates.en);
        await installCandidates(root, id, candidates);
      },
    });
    expect(result[0].state).toBe("SIMULATED_PUBLICATION");
    expect(m.count()).toBe(4);
  }));
test("generated public index accepts technical attestation and excludes outdated automatic editions", () =>
  temporary(async (dir) => {
    const m = mock();
    await runAutomaticCycle(dir, policy(), deps(m.transport));
    const path = join(dir, "content/articles", slug + ".mdx"),
      raw = await readFile(path, "utf8");
    const original = parseEditorialFile(raw, path);
    await generateTranslations([original], parseEditorialFile, false, dir);
    let generated = await readFile(join(dir, "src/content/generated/translations.ts"), "utf8");
    expect(generated).toContain('"automatic"');
    await writeFile(path, raw + "\n");
    await generateTranslations(
      [parseEditorialFile(raw + "\n", path)],
      parseEditorialFile,
      false,
      dir,
    );
    generated = await readFile(join(dir, "src/content/generated/translations.ts"), "utf8");
    expect(generated).not.toContain('"automatic"');
  }));
test("external provider exposure reduces available budget and cannot be silently omitted", () => {
  const p = { ...policy(), externalMonthlyReserveNanoUSD: 10_000_000_000 };
  expect(() => continuousBudget([], slug, "2026-10", "regular", 1, p)).toThrow(
    "monthly-budget-exceeded",
  );
});
test("model access verification is a non-inference mocked request", async () => {
  await verifyModelAccess("a".repeat(32), "SYNTHETIC", async (url, init) => {
    expect(String(url)).toContain("/ai/models/schema?");
    expect(init?.method).toBeUndefined();
    return Response.json({ success: true, result: { input: {}, output: {} } });
  });
});
test("scheduled workflows remain guarded and never deploy before main CI", async () => {
  const root = process.cwd(),
    schedule = parse(await readFile(join(root, ".github/workflows/i18n-continuous.yml"), "utf8"));
  const deploy = parse(await readFile(join(root, ".github/workflows/i18n-production.yml"), "utf8"));
  expect(schedule.jobs.translate.if).toContain("I18N_AUTOMATION_ENABLED == 'true'");
  expect(deploy.jobs.deploy.if).toContain("conclusion == 'success'");
  expect(deploy.jobs.deploy.if).toContain("I18N_AUTOMATIC_DEPLOY_ENABLED == 'true'");
});

test("technical checks catch energy-unit and time-unit substitutions without treating articles as amperes", () => {
  expect(scientificTokensMatch("A potência usa 1 W.", "The power uses 1 W.")).toBe(true);
  expect(scientificTokensMatch("Um aparelho potente.", "A powerful device.")).toBe(true);
  expect(scientificTokensMatch("10 segundos", "10 seconds")).toBe(true);
  expect(scientificTokensMatch("10 segundos", "10 minutes")).toBe(false);
  expect(scientificTokensMatch("3 GWh", "3 TWh")).toBe(false);
  expect(scientificTokensMatch("P = ΔE / Δt", "P = ∆E / ∆t")).toBe(false);
  expect(scientificTokensMatch("P = ΔE / Δt", "P = ΔE / Δt")).toBe(true);
  expect(scientificTokensMatch("100 W e 200 J", "200 W and 100 J")).toBe(false);
});

test("unit checks distinguish ordinals from seconds and normalize capitalized unit names", () => {
  expect(scientificTokensMatch("A segunda medida.", "The second measure.")).toBe(true);
  expect(scientificTokensMatch("Quilowatt é potência.", "Kilovatio es potencia.")).toBe(true);
  expect(scientificTokensMatch("1 joule por segundo", "1 joule per minute")).toBe(false);
});

test("public routes admit technical editions but not pending or fake-human records", () =>
  temporary(async (dir) => {
    const m = mock();
    await runAutomaticCycle(dir, policy(), deps(m.transport));
    const parsed = parseEditorialFile(
        await readFile(join(dir, "content/translations/en", slug + ".mdx"), "utf8"),
      ),
      record = translationSchema.parse(parsed.frontmatter);
    const esParsed = parseEditorialFile(
      await readFile(join(dir, "content/translations/es", slug + ".mdx"), "utf8"),
    );
    const es = translationSchema.parse(esParsed.frontmatter);
    expect(publishedTranslations([record, es])).toHaveLength(2);
    expect(publishedTranslations([record])).toHaveLength(0);
    expect(() =>
      translationSchema.parse({
        ...record,
        translationReview: { ...record.translationReview, reviewer: "fake human" },
      }),
    ).toThrow();
  }));
test("continuous budget cannot be bypassed by the old individual reservation path", () =>
  temporary(async (dir) => {
    const store = join(dir, "i18n/storage"),
      authorization = { ...policy(), externalMonthlyReserveNanoUSD: 10_000_000_000 };
    const b = await append(store, replay([]), "automatic-authorize", fingerprint(authorization), {
      policy: authorization,
    });
    await expect(
      append(store, b, "reserve", "legacy-try", {
        article: slug,
        month: new Date().toISOString().slice(0, 7),
        pool: "regular",
        reserved: 1,
      }),
    ).rejects.toThrow("monthly-budget-exceeded");
    expect((await loadBook(store)).runs.size).toBe(0);
  }));

test("reported usage does not release prior-month unconfirmed liability", () => {
  const authorization = policy();
  const old = {
    id: "old",
    article: "previous",
    month: "2026-09",
    pool: "regular" as const,
    reserved: 8_000_000_000,
    calculated: 1,
    confirmed: null,
    calls: new Set(["en:0"]),
    usage: new Set(["en:0"]),
  };
  expect(() => continuousBudget([old], "next", "2026-10", "regular", 1, authorization)).toThrow(
    "pool-budget-exceeded",
  );
});
