import { parseEditorialFile } from "../../src/content/editorial-parser";
import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import {
  assemble,
  cacheKey,
  decide,
  deterministic,
  dimensions,
  hash,
  policy,
  prepare,
  syntheticMdx,
  verifyAndDecide,
  type Locale,
} from "./pipeline";
import { context, FixtureProvider, fixtureSemantic, sourceBody } from "./fixtures";
import { SimulationStore } from "./cache";

async function fixture(locale: Locale = "en") {
  const source = prepare(sourceBody),
    provider = new FixtureProvider();
  const body = assemble(source, await provider.translate(source.segments, locale));
  const target = prepare(body);
  return { source, target, provider, body, semantic: fixtureSemantic(source, target, locale) };
}
describe("offline scientific translation safeguards", () => {
  for (const locale of ["en", "es"] as const)
    test(`synthetic ${locale}: complete checks, no publication`, async () => {
      const f = await fixture(locale);
      expect(deterministic(sourceBody, f.body, locale)).toEqual([]);
      expect(decide(f.source, f.target, locale, context, f.provider, f.semantic)).toMatchObject({
        outcome: "PASS",
        wouldPublish: false,
      });
      expect(syntheticMdx(f.body, locale, hash(sourceBody))).toContain('"status": "draft"');
      expect(policy.enabled).toBe(false);
    });
  const mutations: [string, (s: string) => string][] = [
    ["changed number", (s) => s.replace("21 Mt", "22 Mt")],
    ["removed citation", (s) => s.replace("[1]", "")],
    ["inverted negation", (s) => s.replace("does not prove", "does prove")],
    ["estimate converted to certainty", (s) => s.replace("The estimate of", "The fact of")],
    ["invented reference", (s) => s + "\n[2] Imaginary study.\n"],
    ["omitted caveat", (s) => s.replace("documentary caveat", "documentation")],
    [
      "resources/reserves confusion",
      (s) => s.replace("Resources are not reserves", "Reserves are not resources"),
    ],
    ["removed conditions", (s) => s.replace("under controlled conditions", "")],
    [
      "causality reversed",
      (s) => s.replace("does not prove production", "is not caused by production"),
    ],
    ["unit changed", (s) => s.replace("2 kWh", "2 MWh")],
    ["formula changed", (s) => s.replace(" + ", " = ")],
    ["image replaced", (s) => s.replace("/fixture-only.svg", "/unapproved.svg")],
    ["credit removed", (s) => s.replace(' credit="Fixture only"', "")],
    [
      "link changed",
      (s) => s.replace("https://example.invalid/evidence", "https://example.invalid/fake"),
    ],
  ];
  for (const [name, mutate] of mutations)
    test(`BLOCK: ${name}`, async () => {
      const f = await fixture();
      const target = prepare(mutate(f.body));
      expect(
        decide(f.source, target, "en", context, f.provider, fixtureSemantic(f.source, target, "en"))
          .outcome,
      ).toBe("BLOCK");
    });
  test("unsafe or invalid MDX is rejected", async () => {
    expect(() => prepare(sourceBody + "\n{process.env.SECRET}\n")).toThrow();
    expect(() => prepare(sourceBody.replace("<Callout", "<Unknown"))).toThrow();
    expect(() => prepare(sourceBody.replace("</Callout>", ""))).toThrow();
  });
  test("number and unit associations cannot swap undetected", () => {
    expect(
      deterministic(
        sourceBody,
        sourceBody.replace("4 °C; energia de 2 kWh", "2 °C; energia de 4 kWh"),
        "es",
      ).some((f) => f.code === "quantity-unit-pairs"),
    ).toBe(true);
  });
  test("missing or partial semantic verification fails closed", async () => {
    const f = await fixture();
    for (const report of [null, { ...f.semantic, checks: f.semantic.checks.slice(1) }])
      expect(decide(f.source, f.target, "en", context, f.provider, report).outcome).toBe(
        "REVIEW_REQUIRED",
      );
  });
  test("fabricated evidence, same model, stale fingerprint cannot PASS", async () => {
    const f = await fixture();
    for (const report of [
      {
        ...f.semantic,
        checks: f.semantic.checks.map((c) => ({ ...c, sourceQuote: "not in the source" })),
      },
      { ...f.semantic, modelVersion: f.provider.modelVersion },
      { ...f.semantic, sourceHash: "stale" },
      { ...f.semantic, provider: f.provider.id },
    ])
      expect(decide(f.source, f.target, "en", context, f.provider, report).outcome).toBe(
        "REVIEW_REQUIRED",
      );
  });
  test("uncertainty and sticky retries never promote automatically", async () => {
    const f = await fixture();
    const uncertain = {
      ...f.semantic,
      checks: f.semantic.checks.map((c) => ({ ...c, result: "uncertain" })),
    };
    expect(decide(f.source, f.target, "en", context, f.provider, uncertain).outcome).toBe(
      "REVIEW_REQUIRED",
    );
    for (const previous of ["REVIEW_REQUIRED", "BLOCK"] as const)
      expect(
        decide(f.source, f.target, "en", context, f.provider, f.semantic, previous).outcome,
      ).toBe(previous);
  });
  test("ART033 and real editorial records cannot auto-release", async () => {
    const f = await fixture();
    for (const risk of [
      { articleId: "ART-033" },
      { synthetic: false },
      { documentaryCaveat: true },
      { pendingEvidence: true },
      { category: "energia" },
    ])
      expect(
        decide(f.source, f.target, "en", { ...context, ...risk }, f.provider, f.semantic).outcome,
      ).toBe("REVIEW_REQUIRED");
  });
  test("real ART033 evidence remains excluded; source and translations are read-only", async () => {
    const slug = "terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1";
    const original = await readFile(`content/articles/${slug}.mdx`, "utf8");
    const brief = await readFile(`content/research/${slug}.yml`, "utf8");
    expect(original).toContain("21");
    expect(brief).toContain("pending");
    for (const locale of ["en", "es"]) {
      const names = await readdir(`content/translations/${locale}`);
      let name: string | undefined;
      for (const candidate of names.filter((n) => n.endsWith(".mdx"))) {
        const raw = await readFile(`content/translations/${locale}/${candidate}`, "utf8");
        const record = parseEditorialFile(raw).frontmatter;
        if ("translationOf" in record && record.translationOf === slug) name = candidate;
      }
      expect(name).toBeDefined();
      if (!name) throw new Error("Missing translation fixture");
      const translation = await readFile(`content/translations/${locale}/${name}`, "utf8");
      expect(translation).toContain('"status": "draft"');
      expect(translation).toContain('"status": "pending"');
    }
  });
  test("cache keys include source, locale, prompt and model", async () => {
    const f = await fixture();
    const key = cacheKey(sourceBody, "en", f.provider, "v1");
    for (const changed of [
      cacheKey(sourceBody + " ", "en", f.provider, "v1"),
      cacheKey(sourceBody, "es", f.provider, "v1"),
      cacheKey(sourceBody, "en", f.provider, "v2"),
      cacheKey(
        sourceBody,
        "en",
        { ...f.provider, translate: f.provider.translate, modelVersion: "v2" },
        "v1",
      ),
    ])
      expect(changed).not.toBe(key);
  });
  test("cache deduplicates, verifies checksums, persists sticky review", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sg-i18n-test-"));
    try {
      const store = new SimulationStore(directory);
      const key = hash("key");
      let calls = 0;
      const generate = async () => {
        calls++;
        return { s0: "fixture" };
      };
      const validate = (v: unknown) => z.record(z.string(), z.string()).parse(v);
      expect((await store.cached(key, validate, generate)).hit).toBe(false);
      expect((await store.cached(key, validate, generate)).hit).toBe(true);
      expect(calls).toBe(1);
      await store.record(key, "REVIEW_REQUIRED");
      await store.record(key, "PASS");
      expect(await store.previous(key)).toBe("REVIEW_REQUIRED");
      await writeFile(
        join(directory, key + ".json"),
        JSON.stringify({ checksum: "wrong", payload: { s0: "altered" } }),
      );
      await expect(store.cached(key, validate, generate)).rejects.toThrow("integrity");
      await expect(store.cached("../escape", validate, generate)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  test("concurrent cache writer and unavailable provider fail closed", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sg-i18n-test-"));
    try {
      const store = new SimulationStore(directory);
      const key = hash("key");
      await writeFile(join(directory, key + ".lock"), "busy");
      await expect(
        store.cached(
          key,
          (v) => v,
          async () => null,
        ),
      ).rejects.toThrow("busy");
      await expect(
        new FixtureProvider().translate([{ id: "x", text: "unknown", start: 0, end: 7 }], "en"),
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  test("semantic evidence has all seven independent dimensions", async () => {
    const f = await fixture();
    expect(f.semantic.checks.map((c) => c.dimension)).toEqual([...dimensions]);
  });
});

test("independent semantic adapter exceptions fail closed", async () => {
  const source = prepare(sourceBody),
    provider = new FixtureProvider();
  const target = prepare(assemble(source, await provider.translate(source.segments, "en")));
  const result = await verifyAndDecide(source, target, "en", context, provider, {
    verify: async () => {
      throw new Error("unavailable");
    },
  });
  expect(result.outcome).toBe("REVIEW_REQUIRED");
  expect(result.wouldPublish).toBe(false);
});

test("explicit Portuguese bibliography heading variants preserve the complete locked bibliography", () => {
  for (const heading of [
    "Referências",
    "Referências Bibliográficas",
    "Referências bibliográficas",
  ]) {
    const body = `Body text.\n\n## ${heading}\n\n[1] Source. https://example.org/\n`;
    const source = prepare(body);
    expect(source.bibliography).toContain("[1] Source.");
    expect(source.segments.every((s) => s.start < body.indexOf("## "))).toBe(true);
    expect(assemble(source, Object.fromEntries(source.segments.map((s) => [s.id, s.text])))).toBe(
      body,
    );
  }
  for (const heading of ["Referências Bibliográficas inventadas", "Outro título"]) {
    expect(() => prepare(`Body.\n\n## ${heading}\n`)).toThrow("Bibliography heading required");
  }
});
