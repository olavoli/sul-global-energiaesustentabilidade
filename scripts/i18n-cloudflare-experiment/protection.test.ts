import { test, expect } from "bun:test";
import {
  loadInput,
  experimentPayload,
  decodeTranslationResponse,
  partialFindings,
  untranslatedFindings,
  validateTranslation,
} from "./experiment";
test("pending IDs are not model outputs or untranslated findings", async () => {
  const input = await loadInput(process.cwd());
  const first = Object.fromEntries(input.chunks[0].map((s) => [s.id, s.text]));
  const findings = partialFindings(input, first, "en");
  for (const id of ["s48", "s52", "s53", "s54", "s58", "s59", "s67", "s68", "s74"])
    expect(findings.some((f) => f.segment === id)).toBe(false);
  expect(
    untranslatedFindings(input, {
      s48: input.source.segments.find((s) => s.id === "s48")?.text ?? "",
    }).some((f) => f.segment === "s48" && f.code === "unchanged-source-prose"),
  ).toBe(true);
});
test("equation never enters model payload; prose and IDs do", async () => {
  const input = await loadInput(process.cwd());
  const payload = experimentPayload(input.chunks[0], "en");
  const sent = JSON.parse(payload.messages[1].content);
  expect(sent.some((s: { id: string }) => s.id === "s10")).toBe(false);
  expect(payload.messages[1].content).not.toContain("ΔE");
  expect(payload.messages[0].content).toContain("Translate EVERY");
  expect(payload.messages[0].content).toContain("English");
  expect(experimentPayload(input.chunks[0], "es").messages[0].content).toContain("Spanish");
  const reversed = [...sent].reverse();
  const result = decodeTranslationResponse({ translations: reversed }, sent);
  for (const s of sent) expect(result[s.id]).toBe(s.text);
  expect(() =>
    decodeTranslationResponse(
      { translations: [...sent, { id: "s10", text: "P = ∆E / ∆t" }] },
      sent,
    ),
  ).toThrow("ids-invalid");
});
test("Unicode mutation is real but source-copy avoids rewriting it; MDX remains protected", async () => {
  const input = await loadInput(process.cwd());
  const all = Object.fromEntries(
    [...input.source.segments, ...input.metadata].map((s) => [s.id, s.text]),
  );
  expect(validateTranslation(input, { ...all, s10: "P = ∆E / ∆t" }, "en").mdx).toBeNull();
  const valid = validateTranslation(input, all, "en");
  expect(valid.mdx).not.toBeNull();
  expect(valid.body).toContain("P = ΔE / Δt");
  expect(valid.findings.some((f) => f.code === "unchanged-source-prose")).toBe(true);
  expect("Δ".codePointAt(0)).toBe(0x394);
  expect("∆".codePointAt(0)).toBe(0x2206);
});
