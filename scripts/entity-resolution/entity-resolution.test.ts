import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import { canonicalEntitySchema, type CanonicalEntity } from "./contracts";
import { normalizeEntityName } from "./normalize";
import { explainDeterministicMatch, findDuplicateCandidates } from "./resolver";
import { reviewDuplicateCandidate } from "./review";
import { saveResolutionState } from "./store";

const at = "2026-07-21T12:00:00.000Z";
function institution(
  id: string,
  name: string,
  input: Partial<CanonicalEntity> = {},
): CanonicalEntity {
  return {
    id: `institution-${id.padEnd(16, "0")}`,
    type: "institution",
    canonicalName: name,
    normalizedName: normalizeEntityName(name),
    aliases: [],
    externalIds: {},
    sourceNodeIds: [`node-${id}`],
    createdAt: at,
    updatedAt: at,
    ...input,
  };
}

describe("Sprint 24 — resolução determinística de entidades", () => {
  test("normaliza nome de modo explicável", () =>
    expect(normalizeEntityName("Massachusetts Inst. Tech.")).toBe("massachusetts inst tech"));
  test("ROR tem precedência e confiança 100", () => {
    const left = institution("1", "MIT", { externalIds: { ror: "https://ror.org/042nb2s44" } });
    const right = institution("2", "Massachusetts Institute of Technology", {
      externalIds: { ror: "042nb2s44" },
    });
    expect(explainDeterministicMatch(left, right)).toMatchObject({ rule: "ror", confidence: 100 });
  });
  test("nome normalizado exato vale 80, sem fuzzy", () => {
    expect(
      explainDeterministicMatch(institution("1", "MIT"), institution("2", "MIT")),
    ).toMatchObject({ rule: "normalized-name", confidence: 80 });
    expect(
      explainDeterministicMatch(institution("1", "MIT"), institution("2", "M I T")),
    ).toBeUndefined();
  });
  test("alias conhecido vale 60", () => {
    const left = institution("1", "Massachusetts Institute of Technology", { aliases: ["MIT"] });
    expect(explainDeterministicMatch(left, institution("2", "MIT"))).toMatchObject({
      rule: "known-alias",
      confidence: 60,
    });
  });
  test("candidato nunca é unido automaticamente", () => {
    const candidates = findDuplicateCandidates(
      [institution("1", "MIT"), institution("2", "MIT")],
      new Date(at),
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].status).toBe("pending");
    expect(candidates[0].leftEntityId).not.toBe(candidates[0].rightEntityId);
  });
  test("aceitar registra revisão e preserva as duas entidades", async () => {
    const adapter = new MemoryStorageAdapter();
    const entities = [institution("1", "MIT"), institution("2", "MIT")];
    const candidates = findDuplicateCandidates(entities, new Date(at));
    await saveResolutionState(entities, candidates, adapter);
    const reviewed = await reviewDuplicateCandidate({
      id: candidates[0].id,
      status: "accepted",
      actor: "Olavo",
      note: "Correspondência verificada.",
      now: new Date(at),
      adapter,
    });
    expect(reviewed.status).toBe("accepted");
    expect(reviewed.history).toHaveLength(1);
    expect(entities).toHaveLength(2);
  });

  test("identidade sem registro-fonte é rejeitada", () => {
    expect(() =>
      canonicalEntitySchema.parse({ ...institution("1", "MIT"), sourceNodeIds: [] }),
    ).toThrow();
  });

  test("CLI bloqueia NEWSROOM_ENVIRONMENT e VITE_APP_ENV remotos", async () => {
    const source = await readFile("scripts/entity-resolution-cli.ts", "utf8");
    expect(source).toContain("process.env.NEWSROOM_ENVIRONMENT ?? process.env.VITE_APP_ENV");
    expect(source).toContain('["production", "staging"].includes(environment)');
  });
});
