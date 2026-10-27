import { test, expect } from "bun:test";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadInput,
  protectedEquation,
  experimentPayload,
  partialFindings,
  validateTranslation,
  runExperiment,
  splitBoundary,
} from "./experiment";
import { prepare, assemble, deterministic } from "../i18n-simulation/pipeline";
import historical from "./campaign003-findings.fixture.json";
import translations from "./complete-translations.fixture.json";
test("historical protected IDs were not submitted and re-parsed findings are not raw ID pairs", async () => {
  const input = await loadInput(process.cwd());
  const sent = JSON.parse(experimentPayload(input.chunks[0], "en").messages[1].content) as {
    id: string;
    text: string;
  }[];
  expect(sent.map((s) => s.id)).toEqual(historical.submittedIDs);
  for (const pair of sent) {
    const source = input.source.segments.find((s) => s.id === pair.id);
    if (!source) throw new Error("submitted-id-not-in-source");
    expect(pair.text).toBe(splitBoundary(source.text).core);
  }
  for (const id of ["s40", "s42"]) {
    expect(sent.some((s) => s.id === id)).toBe(false);
    expect(historical.protectedIDs).toContain(id);
    expect(historical.findings.some((f) => "segment" in f && f.segment === id)).toBe(true);
  }
});
test("reconstructed missing boundary spaces collapse AST leaves but do not change copied equations", async () => {
  const input = await loadInput(process.cwd());
  const mapped: Record<string, string> = Object.fromEntries(
    input.chunks[0].map((s) => [
      s.id,
      protectedEquation(s) ? s.text : (translations.en as Record<string, string>)[s.id],
    ]),
  );
  // Reconstructed failure, NOT a claim about the unavailable raw API output.
  mapped.s35 = "The ";
  mapped.s37 = "is a unit of power. The ";
  mapped.s39 = "is a unit of energy.";
  const partial = assemble(
    input.source,
    Object.fromEntries(input.source.segments.map((s) => [s.id, mapped[s.id] ?? s.text])),
  );
  expect(prepare(partial).skeleton).not.toBe(input.source.skeleton);
  expect(
    deterministic(input.source.body, partial, "en").some((f) => f.code === "segment-count"),
  ).toBe(true);
  expect(mapped.s40).toBe("E = P × t");
  expect(mapped.s42).toBe("1 kWh = 3,6 MJ");
  const corrected = partialFindings(input, mapped, "en");
  expect(
    corrected.some((f) => f.segment === "s37" && f.code === "segment-boundary-whitespace"),
  ).toBe(true);

  expect(corrected.some((f) => f.segment === "s40" || f.segment === "s42")).toBe(false);
  expect(corrected.some((f) => f.segment === "s48")).toBe(false);
  const complete = {
    ...translations.en,
    ...Object.fromEntries(
      input.source.segments.filter(protectedEquation).map((s) => [s.id, s.text]),
    ),
    s35: mapped.s35,
    s37: mapped.s37,
    s39: mapped.s39,
  };
  expect(validateTranslation(input, complete, "en").mdx).toBeNull();
});
test("real structure mutation still blocks one simulated call and saves no MDX", async () => {
  const input = await loadInput(process.cwd()),
    dir = await mkdtemp(join(tmpdir(), "sg-c003-regression-"));
  let calls = 0;
  try {
    const report = await runExperiment(input, dir, {
      execute: true,
      authorized: true,
      auth: { account: "a".repeat(32), token: "synthetic-only" },
      transport: async (_url, init) => {
        calls++;
        const payload = JSON.parse(String(init.body));
        const sent = JSON.parse(payload.messages[1].content) as { id: string; text: string }[];
        return Response.json({
          success: true,
          result: {
            response: {
              translations: sent
                .map((s) => ({
                  id: s.id,
                  text:
                    s.id === "s37"
                      ? "**is a unit of power. The**"
                      : (translations.en as Record<string, string>)[s.id],
                }))
                .reverse(),
            },
            usage: { prompt_tokens: 1015, completion_tokens: 884 },
          },
        });
      },
    });
    expect(calls).toBe(1);
    expect(report.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
    expect(
      report.results[0].findings.some(
        (f) => f.code === "segment-structure-changed" && f.segment === "s37",
      ),
    ).toBe(true);
    expect(report.results[0].findings.some((f) => f.segment === "s40" || f.segment === "s42")).toBe(
      false,
    );
    expect((await readdir(dir)).some((n) => n.endsWith(".mdx"))).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
