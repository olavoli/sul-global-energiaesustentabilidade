import { createHash } from "node:crypto";

import { expect, test } from "bun:test";
import { topicEntries, topicEntrySchema } from "./topic-entries";

import { taxonomyCatalog } from "./taxonomy-catalog";
import { getTagTopic } from "./tags";

test("classificação é apresentação configurável, não identidade de taxonomia", () => {
  const ids = taxonomyCatalog.map((t) => t.id);
  for (const entry of topicEntries) {
    const changed = topicEntrySchema.parse({
      ...entry,
      editorialClassification: "Ciência · Recorte editorial específico",
    });
    expect(changed.termId).toBe(entry.termId);
    expect(getTagTopic(entry.termId.slice(4))?.slug).toBe(entry.termId.slice(4));
    expect(() => topicEntrySchema.parse({ ...entry, editorialClassification: " " })).toThrow();
  }
  expect(taxonomyCatalog.map((t) => t.id)).toEqual(ids);
  expect(new Set(topicEntries.map((e) => e.editorialClassification)).size).toBe(4);
});

test("as referências cadastradas são efetivamente utilizadas, sem citações soltas", () => {
  for (const entry of topicEntries) {
    const used = new Set([entry.definition, ...entry.sections].flatMap((block) => block.sourceIds));
    expect([...used].sort()).toEqual(entry.sources.map((source) => source.id).sort());
    expect(entry.editorialReviewedAt).toBe("2026-11-27");
  }
});

test("fotocatálise permanece reservada mesmo com classificação editorial definida", () => {
  expect(getTagTopic("fotocatalise")).toBeUndefined();
  expect(taxonomyCatalog.some((term) => term.id === "tag:fotocatalise")).toBe(false);
  expect(() => topicEntrySchema.parse({ ...topicEntries[0], termId: "tag:fotocatalise" })).toThrow(
    "Identificador de tag inexistente",
  );
});

const approvedHashes = [
  {
    termId: "tag:hidrogenio-verde",
    sha256: "851243f8e55f2fb223692792b930f9fbfdd11a845a65df716ca8c8cc405bf468",
  },
  {
    termId: "tag:cobre",
    sha256: "e43c4b9275f193f9eae5d7d50b474d6c97f9ff8137a9983e238425c009e09152",
  },
  {
    termId: "tag:armazenamento-de-energia",
    sha256: "f1a089ace55bbf8d9bd47cd8387516d5718099e44934f2d2216e3997a14498ac",
  },
  {
    termId: "tag:transicao-energetica",
    sha256: "a7743d5c4f1f352421a5fe12eb537a48b3534b1084247b62f542eafc62df796e",
  },
];

test("os quatro textos aprovados permanecem idênticos, incluindo fontes e classificação", () => {
  for (const entry of topicEntries) {
    const { status, editorialReviewedAt, ...content } = entry;
    expect(status).toBe("approved");
    expect(editorialReviewedAt).toBe("2026-11-27");
    expect(createHash("sha256").update(JSON.stringify(content)).digest("hex")).toBe(
      approvedHashes.find((item) => item.termId === entry.termId)?.sha256 ??
        "missing-approved-hash",
    );
  }
});

test("aprovação exige registro de data e não promove indexabilidade", () => {
  expect(() => topicEntrySchema.parse({ ...topicEntries[0], editorialReviewedAt: null })).toThrow(
    "exige data",
  );
  expect(getTagTopic("cobre")?.indexable).toBe(false);
});
