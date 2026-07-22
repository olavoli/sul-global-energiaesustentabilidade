import { describe, expect, test } from "bun:test";
import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import type { ScientificWork } from "../scientific-radar/contracts";
import { updateResearchChecklist } from "./checklist";
import { sanitizeResearchMarkdown } from "./markdown";
import { changeResearchNote } from "./notes";
import { searchResearchWorks } from "./search";
import { settleResearchModule } from "./read-model";
import { loadResearchNotes } from "./store";

const work = {
  id: "radar-70ab9f6136b8d720",
  doi: "10.1002/advs.202510481",
  title: "Why Will Polymers Win the Race for Solid-State Batteries?",
  authors: ["Pilot Author"],
  institutions: ["Pilot Institute"],
  categories: ["batteries"],
  journal: "Advanced Science",
  publicationDate: "2026-01-01",
} as ScientificWork;

describe("research workspace", () => {
  test("sanitizes Markdown without generating text", () => {
    expect(sanitizeResearchMarkdown("# Note\n<script>alert(1)</script>[x](javascript:a)")).toBe(
      "# Note\nalert(1)[x](#)",
    );
  });

  test("creates immutable note revisions and keeps bodies out of audit storage", async () => {
    const adapter = new MemoryStorageAdapter();
    const created = await changeResearchNote({
      action: "create",
      workId: work.id,
      title: "Manual",
      bodyMarkdown: "first",
      actor: "reviewer",
      now: "2026-07-22T12:00:00.000Z",
      adapter,
    });
    const updated = await changeResearchNote({
      action: "update",
      noteId: created.noteId,
      workId: work.id,
      bodyMarkdown: "second",
      actor: "reviewer",
      now: "2026-07-22T12:01:00.000Z",
      adapter,
    });
    const stored = await loadResearchNotes(adapter);
    expect(updated.version).toBe(2);
    expect(stored.value.history.map(({ bodyMarkdown }) => bodyMarkdown)).toEqual([
      "first",
      "first",
    ]);
    expect((await adapter.listAudit(10)).items).toEqual([]);
  });

  test("updates one checklist item only by explicit human action", async () => {
    const adapter = new MemoryStorageAdapter();
    const checklist = await updateResearchChecklist({
      workId: work.id,
      key: "evidence-reviewed",
      checked: true,
      actor: "reviewer",
      now: "2026-07-22T12:00:00.000Z",
      adapter,
    });
    expect(checklist.items).toHaveLength(15);
    expect(checklist.items.filter(({ checked }) => checked).map(({ key }) => key)).toEqual([
      "evidence-reviewed",
    ]);
    expect(checklist.items.find(({ key }) => key === "evidence-reviewed")?.actorId).toBe(
      "reviewer",
    );
  });

  test("searches local structured fields deterministically", () => {
    expect(searchResearchWorks([work], "10.1002 batteries 2026")).toHaveLength(1);
    expect(searchResearchWorks([work], "unrelated")).toHaveLength(0);
  });

  test("represents a missing module without failing the workspace", async () => {
    const loaded = await settleResearchModule(
      () => Promise.reject(new Error("missing")),
      () => 1,
    );
    expect(loaded.value).toBeUndefined();
    expect(loaded.state).toEqual({ available: false, count: 0, error: "Error" });
  });
});
