import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadInput,
  splitBoundary,
  restoreBoundary,
  experimentPayload,
  protectedEquation,
  runExperiment,
  validateTranslation,
} from "./experiment";
import fixture from "./complete-translations.fixture.json";
const cases: Record<string, string> = {
  s13: "represents power, ",
  s15: "represents the energy variation and ",
  s17: "represents the time interval.",
  s37: "is a unit of power. The ",
  s39: "is a unit of energy.",
};
test("five campaign004 cases and all fifteen boundary segments restore source boundaries only", async () => {
  const input = await loadInput(process.cwd()),
    all = [...input.source.segments, ...input.metadata];
  const boundaries = all.filter((s) => {
    const b = splitBoundary(s.text);
    return b.prefix || b.suffix;
  });
  expect(boundaries).toHaveLength(15);
  for (const locale of ["en", "es"] as const) {
    const targets: Record<string, string> = fixture[locale];
    const map = Object.fromEntries(
      all.map((s) => {
        if (protectedEquation(s)) return [s.id, s.text];
        const raw = locale === "en" && cases[s.id] ? cases[s.id] : targets[s.id];
        const restored = restoreBoundary(s.text, raw);
        expect(splitBoundary(restored.text).core).toBe(splitBoundary(raw).core);
        return [s.id, restored.text];
      }),
    );
    expect(validateTranslation(input, map, locale).mdx).not.toBeNull();
    for (const s of boundaries) {
      expect(splitBoundary(map[s.id]).prefix).toBe(splitBoundary(s.text).prefix);
      expect(splitBoundary(map[s.id]).suffix).toBe(splitBoundary(s.text).suffix);
    }
  }
  for (const chunk of input.chunks) {
    const sent = JSON.parse(experimentPayload(chunk, "en").messages[1].content) as {
      id: string;
      text: string;
    }[];
    for (const s of sent) {
      const source = all.find((x) => x.id === s.id);
      if (!source) throw Error("missing-source");
      expect(s.text).toBe(splitBoundary(source.text).core);
      expect(protectedEquation(source)).toBe(false);
    }
  }
});
test("only ASCII boundary whitespace is handled, internal text Unicode punctuation and formulas remain untouched", () => {
  expect(restoreBoundary(" \tword\r\n", "\nother\t").text).toBe(" \tother\r\n");
  expect(restoreBoundary(" word ", "x  y\tz").text).toBe(" x  y\tz ");
  expect(restoreBoundary(" word ", "\u00a0x\u202f").text).toBe(" \u00a0x\u202f ");
  expect(restoreBoundary(" word ", "ΔE / Δt, text.").text).toBe(" ΔE / Δt, text. ");
  for (const invalid of ["", " \t\r\n", "\u00a0"])
    expect(() => restoreBoundary(" text ", invalid)).toThrow("empty-linguistic-core");
  expect(() => restoreBoundary(" \t", "words")).toThrow("empty-linguistic-core");
});
test("trimmed cores assemble complete EN ES with explicit diagnostics, while numerical losses still block", async () => {
  const input = await loadInput(process.cwd()),
    dir = await mkdtemp(join(tmpdir(), "sg-boundaries-"));
  let calls = 0;
  try {
    const report = await runExperiment(input, dir, {
      execute: true,
      authorized: true,
      auth: { account: "a".repeat(32), token: "synthetic-only" },
      transport: async (_url, init) => {
        calls++;
        const p = JSON.parse(String(init.body)),
          locale = p.messages[0].content.includes("Target language: English") ? "en" : "es";
        const target: Record<string, string> = fixture[locale];
        const sent = JSON.parse(p.messages[1].content) as { id: string }[];
        return Response.json({
          success: true,
          result: {
            response: {
              translations: sent
                .map((s) => ({ id: s.id, text: splitBoundary(target[s.id]).core }))
                .reverse(),
            },
            usage: { prompt_tokens: 100, completion_tokens: 100 },
          },
        });
      },
    });
    expect(calls).toBe(6);
    expect(report.state).toBe("TRANSLATED_AWAITING_REVIEW");
    for (const row of report.results) {
      expect(row.decision).toBe("REVIEW_REQUIRED");
      expect(row.boundaryDiagnostics).toHaveLength(71);
      expect(row.boundaryDiagnostics.find((d) => d.id === "s13")?.prefix).toBe(" ");
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const all = [...input.source.segments, ...input.metadata];
  const map = Object.fromEntries(
    all.map((s) => [
      s.id,
      protectedEquation(s)
        ? s.text
        : restoreBoundary(s.text, (fixture.en as Record<string, string>)[s.id]).text,
    ]),
  );
  map.s26 = restoreBoundary(input.source.segments[26].text, "appliance A: 9 kW for 1 hour;").text;
  expect(validateTranslation(input, map, "en").mdx).toBeNull();
});
