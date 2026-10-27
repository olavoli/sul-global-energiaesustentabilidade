import { test, expect } from "bun:test";
import { z } from "zod";
import { readFile, writeFile, readdir, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { remarkEditorialSlots } from "../../src/content/remark-editorial-slots";
import { parseEditorialFile } from "../generate-content";
import { prepare, type Locale } from "../i18n-simulation/pipeline";
import {
  loadInput,
  runExperiment,
  protectedEquation,
  validateTranslation,
  type Input,
} from "./experiment";
import type { Transport } from "../i18n-real-pilot/adapters";
import fixture from "./complete-translations.fixture.json";

const root = process.cwd();
const auth = { account: "a".repeat(32), token: "SYNTHETIC-TEST-ONLY-NOT-A-CREDENTIAL" };
const output = join(root, "test-results/i18n-cloudflare-offline-e2e");
const targets: Record<Locale, Record<string, string>> = { en: fixture.en, es: fixture.es };
async function snapshot(directory: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory())
      for (const [key, value] of Object.entries(await snapshot(path)))
        result[join(item.name, key)] = value;
    else if (item.isFile())
      result[item.name] = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
    else throw Error("unexpected-nonregular-file");
  }
  return result;
}
async function temporary(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "sg-offline-e2e-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
function simulated(input: Input, mode = "valid") {
  const seen: Record<Locale, string[]> = { en: [], es: [] };
  let calls = 0;
  const transport: Transport = async (url, init) => {
    expect(new URL(url).hostname).toBe("api.cloudflare.com");
    const payload = JSON.parse(String(init.body));
    const locale: Locale = payload.messages[0].content.includes("Target language: English")
      ? "en"
      : "es";
    const segments: { id: string; text: string }[] = JSON.parse(payload.messages[1].content);
    const expected = input.chunks[calls % 3].filter((s) => !protectedEquation(s));
    expect(segments.map((s) => s.id)).toEqual(expected.map((s) => s.id));
    expect(locale).toBe(calls < 3 ? "en" : "es");
    seen[locale].push(...segments.map((s) => s.id));
    calls++;
    if (mode === "interrupted" && calls === 2) throw Error("synthetic-interruption");
    const use = mode === "swapped" && locale === "en" ? "es" : locale;
    let translations = segments.map((s) => ({
      id: s.id,
      text: mode === "unchanged" ? s.text : targets[use][s.id],
    }));
    if (mode === "duplicate") translations.push(translations[0]);
    if (mode === "missing") translations = translations.slice(1);
    if (mode === "equation") translations.push({ id: "s10", text: "P = ∆E / ∆t" });
    const response =
      mode === "incomplete"
        ? undefined
        : mode === "json"
          ? "{broken"
          : calls % 2
            ? { translations: translations.reverse() }
            : JSON.stringify({ translations: translations.reverse() });
    return Response.json({
      success: true,
      result: { response, usage: { prompt_tokens: 100, completion_tokens: 100, neurons: 1 } },
    });
  };
  return { transport, seen, count: () => calls };
}
async function compiled(raw: string) {
  const parsed = parseEditorialFile(raw, "SYNTHETIC-NONPUBLISHABLE.mdx");
  const code = await compile(raw, { remarkPlugins: [remarkFrontmatter, remarkEditorialSlots] });
  expect(String(code)).toContain("MDXContent");
  return parsed;
}

test("six synthetic replies assemble and compile complete EN ES without public writes or historical mutations", async () => {
  const historyPath = join(root, "test-results/i18n-cloudflare-experiment");
  const historyBefore = await snapshot(historyPath);
  const contentBefore = await snapshot(join(root, "content"));
  const indicesBefore = await snapshot(join(root, "src/content"));
  const input = await loadInput(root);
  expect(input.sourceRevision).toBe(fixture.sourceRevision);
  expect(input.chunks).toHaveLength(3);
  const all = [...input.source.segments, ...input.metadata];
  const sent = all.filter((s) => !protectedEquation(s));
  for (const locale of ["en", "es"] as const) {
    expect(Object.keys(targets[locale]).sort()).toEqual(sent.map((s) => s.id).sort());
    for (const segment of sent) {
      expect(targets[locale][segment.id]).not.toBe(segment.text);
      expect(targets.en[segment.id]).not.toBe(targets.es[segment.id]);
    }
  }
  const coverage: unknown[] = [];
  try {
    await temporary(async (directory) => {
      const mock = simulated(input);
      const report = await runExperiment(input, directory, {
        execute: true,
        authorized: true,
        auth,
        transport: mock.transport,
      });
      expect(report.state).toBe("TRANSLATED_AWAITING_REVIEW");
      expect(mock.count()).toBe(6);
      expect(report.measurementOrigin).toBe("injected-test-transport");
      await mkdir(output, { recursive: true });
      for (const row of report.results) {
        expect(row.decision).toBe("REVIEW_REQUIRED");
        expect(row.artifact).not.toBeNull();
        expect(mock.seen[row.locale].sort()).toEqual(sent.map((s) => s.id).sort());
        expect(new Set(mock.seen[row.locale]).size).toBe(sent.length);
        expect(row.findings.some((f) => f.severity === "critical")).toBe(false);
        const raw = await readFile(join(directory, `NONPUBLISHABLE-${row.locale}.mdx`), "utf8");
        const parsed = await compiled(raw);
        expect(parsed.frontmatter.status).toBe("draft");
        const extra = z
          .object({
            locale: z.enum(["en", "es"]),
            translationReview: z.object({ status: z.literal("pending") }),
            experimentDecision: z.literal("REVIEW_REQUIRED"),
            experimentOnly: z.literal(true),
            publishable: z.literal(false),
            cover: z.record(z.string(), z.unknown()),
          })
          .passthrough()
          .parse(JSON.parse(raw.split("---")[1]));
        expect(extra.locale).toBe(row.locale);
        expect(extra.translationReview.status).toBe("pending");
        expect(extra.experimentDecision).toBe("REVIEW_REQUIRED");
        expect(extra.publishable).toBe(false);
        expect(extra.experimentOnly).toBe(true);
        for (const key of ["publishedAt", "approvedAt", "reviewedAt", "scheduledAt", "updatedAt"])
          expect(extra[key]).toBeUndefined();
        const target = prepare(parsed.body);
        expect(target.skeleton).toBe(
          input.source.skeleton.replace(
            /^## Referências$/m,
            row.locale === "en" ? "## References" : "## Referencias",
          ),
        );
        expect(target.bibliography).toBe(input.source.bibliography);
        expect(target.segments).toHaveLength(input.source.segments.length);
        for (const segment of input.source.segments)
          expect(target.segments.find((s) => s.id === segment.id)?.text).toBe(
            protectedEquation(segment) ? segment.text : targets[row.locale][segment.id],
          );
        for (const meta of input.metadata) {
          const [kind, key] = meta.id.split(":");
          expect(kind === "cover" ? extra.cover[key] : extra[key]).toBe(
            targets[row.locale][meta.id],
          );
        }
        coverage.push({
          locale: row.locale,
          calls: 3,
          body: input.source.segments.length,
          protected: all.filter(protectedEquation).length,
          translatedBody: input.source.segments.filter((s) => !protectedEquation(s)).length,
          metadata: input.metadata.map((s) => s.id),
          submitted: mock.seen[row.locale].length,
          unique: new Set(mock.seen[row.locale]).size,
          segmentTypes: {
            proseOrHeading: input.source.segments.filter(
              (s) =>
                !protectedEquation(s) &&
                !/(?:alt|caption|title)=["']$/.test(
                  input.source.body.slice(Math.max(0, s.start - 20), s.start),
                ),
            ).length,
            mdxTextAttributes: input.source.segments.filter((s) =>
              /(?:alt|caption|title)=["']$/.test(
                input.source.body.slice(Math.max(0, s.start - 20), s.start),
              ),
            ).length,
            punctuation: input.source.segments.filter((s) => /^[.,;:!?]+$/.test(s.text.trim()))
              .length,
            equationsOrSymbols: input.source.segments.filter(
              (s) => protectedEquation(s) && !/^[.,;:!?]+$/.test(s.text.trim()),
            ).length,
            metadata: input.metadata.length,
          },
          assembled: target.segments.length + input.metadata.length,
          compiled: true,
          decision: row.decision,
          reviewFindings: row.findings,
        });
        const marked = raw.replace(
          '"EXPERIMENT ONLY: NOT PUBLISHABLE. NO INDEPENDENT SCIENTIFIC REVIEW."',
          '"SYNTHETIC OFFLINE FIXTURE ONLY. NOT MODEL OUTPUT. NOT LINGUISTICALLY VALIDATED. NOT PUBLISHABLE."',
        );
        await compiled(marked);
        await writeFile(join(output, `SYNTHETIC-NONPUBLISHABLE-${row.locale}.mdx`), marked);
      }
      await writeFile(
        join(output, "coverage.json"),
        JSON.stringify(
          {
            notice: fixture.notice,
            measurementOrigin: "injected-test-transport",
            realUsage: null,
            realBilling: null,
            coverage,
          },
          null,
          2,
        ),
      );
    });
  } finally {
    expect(await snapshot(historyPath)).toEqual(historyBefore);
    expect(await snapshot(join(root, "content"))).toEqual(contentBefore);
    expect(await snapshot(join(root, "src/content"))).toEqual(indicesBefore);
  }
});
for (const mode of ["incomplete", "duplicate", "missing", "equation", "json", "interrupted"])
  test(`offline failure ${mode}: no public or partial MDX`, async () =>
    temporary(async (directory) => {
      const input = await loadInput(root),
        mock = simulated(input, mode);
      const report = await runExperiment(input, directory, {
        execute: true,
        authorized: true,
        auth,
        transport: mock.transport,
      });
      expect(report.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
      expect(mock.count()).toBe(mode === "interrupted" ? 2 : 1);
      expect((await readdir(directory)).some((n) => n.endsWith(".mdx"))).toBe(false);
      expect(report.publishable).toBe(false);
    }));
for (const mode of ["swapped", "unchanged"])
  test(`offline quality failure ${mode} never implies publication approval`, async () =>
    temporary(async (directory) => {
      const input = await loadInput(root),
        mock = simulated(input, mode);
      const report = await runExperiment(input, directory, {
        execute: true,
        authorized: true,
        auth,
        transport: mock.transport,
      });
      expect(report.state).toBe("TRANSLATED_AWAITING_REVIEW");
      expect(report.results.every((r) => r.decision === "REVIEW_REQUIRED")).toBe(true);
      expect(report.publishable).toBe(false);
      expect(report.independentReviewPerformed).toBe(false);
      expect(
        report.results[0].findings.some(
          (f) =>
            f.code ===
            (mode === "unchanged" ? "unchanged-source-prose" : "negation-modality-mineral-caveat"),
        ),
      ).toBe(true);
      if (mode === "swapped") {
        const parsed = parseEditorialFile(
          await readFile(join(directory, "NONPUBLISHABLE-en.mdx"), "utf8"),
        );
        expect(prepare(parsed.body).segments[0].text).not.toBe(fixture.en.s0);
        expect(prepare(parsed.body).segments[0].text).toBe(fixture.es.s0);
      }
    }));
test("direct formula mutation still fails and Portuguese article O is translatable", async () => {
  const input = await loadInput(root);
  expect(protectedEquation({ text: "O " })).toBe(false);
  const all = Object.fromEntries(
    [...input.source.segments, ...input.metadata].map((s) => [
      s.id,
      protectedEquation(s) ? s.text : targets.en[s.id],
    ]),
  );
  expect(validateTranslation(input, { ...all, s10: "P = ∆E / ∆t" }, "en").mdx).toBeNull();
});
