import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { storageMigrations, applyMigrations } from "./migrations";
import { LocalCommentDatabase } from "../../../src/lib/comments/test-database";
describe("migration aditiva de interações", () => {
  test("SQL e registro são equivalentes, sem operação destrutiva", () => {
    const sql = readFileSync("scripts/newsroom/storage/0004_comment_interactions.sql", "utf8");
    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
    expect(storageMigrations[3].statements.map(normalize)).toEqual(
      sql.split(";").map(normalize).filter(Boolean),
    );
    expect(sql).not.toMatch(/DROP|DELETE FROM|TRUNCATE|REPLACE/i);
    expect(sql).toContain("WHERE status='approved' AND published_at IS NULL");
  });
  test("registro controla aplicação única da migration local", async () => {
    const db = new LocalCommentDatabase(0);
    expect(await applyMigrations(db)).toEqual([1, 2, 3, 4, 5]);
    expect(await applyMigrations(db)).toEqual([]);
    expect(db.sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  test("índices e foreign keys existem no banco local", () => {
    const db = new LocalCommentDatabase();
    expect(db.sqlite.query("PRAGMA foreign_key_list('comment_reactions')").all()).toHaveLength(1);
    expect(db.sqlite.query("PRAGMA foreign_key_list('comment_reports')").all()).toHaveLength(1);
    expect(db.sqlite.query("PRAGMA foreign_key_list('public_comments')").all()).toHaveLength(2);
    expect(
      db.sqlite
        .query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'comment_%'")
        .all().length,
    ).toBeGreaterThanOrEqual(5);
  });
  test("todos os estados históricos e campos anonimizados sobrevivem ao executor", async () => {
    const db = new LocalCommentDatabase(3);
    for (const migration of storageMigrations.slice(0, 3))
      db.sqlite
        .query("INSERT INTO newsroom_migrations VALUES (?,?,?)")
        .run(migration.version, migration.name, "2026-01-01");
    const created = "2026-01-01T00:00:00.000Z";
    const later = "2026-04-02T00:00:00.000Z";
    const states = [
      "approved",
      "pending",
      "rejected",
      "spam",
      "deleted",
      "rejected-anonymized",
      "spam-anonymized",
    ];
    for (const id of states) {
      const status = id.split("-")[0];
      const anonymized = id.includes("anonymized") || status === "deleted";
      db.sqlite
        .query(
          `INSERT INTO public_comments (id,article_slug,status,public_name,email_normalized,email_hash,body_text,consent_version,consented_at,created_at,updated_at,approved_at,rejected_at,deleted_at,anonymized_at)
        VALUES (?,'o-que-e-energia',?,?,?,?,?,'comments-v1',?,?,?,?,?,?,?)`,
        )
        .run(
          id,
          status,
          anonymized ? null : "Pessoa",
          anonymized ? null : "local@example.com",
          "a".repeat(64),
          anonymized ? null : "Texto histórico",
          created,
          created,
          later,
          status === "approved" ? created : null,
          ["rejected", "spam"].includes(status) ? created : null,
          status === "deleted" ? later : null,
          anonymized ? later : null,
        );
    }
    const before = db.sqlite.query("SELECT * FROM public_comments ORDER BY id").all() as Record<
      string,
      unknown
    >[];
    expect(await applyMigrations(db)).toEqual([4, 5]);
    const after = db.sqlite.query("SELECT * FROM public_comments ORDER BY id").all() as Record<
      string,
      unknown
    >[];
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toMatchObject(before[i]);
      expect(after[i].published_at).toBe(
        before[i].status === "approved" ? before[i].approved_at : null,
      );
      expect(after[i].parent_comment_id).toBeNull();
      expect(after[i].root_comment_id).toBeNull();
    }
  });
  test("reviewed/dismissed exigem data não nula e cronologia válida", () => {
    const db = new LocalCommentDatabase();
    const timestamp = "2026-01-01T00:00:00.000Z";
    db.sqlite
      .query(
        `INSERT INTO public_comments (id,article_slug,status,public_name,email_normalized,email_hash,body_text,consent_version,consented_at,created_at,updated_at,approved_at)
      VALUES ('root','o-que-e-energia','approved','Pessoa','local@example.com',?,'Texto','comments-v1',?,?,?,?)`,
      )
      .run("a".repeat(64), timestamp, timestamp, timestamp, timestamp);
    const insert = db.sqlite.query(
      "INSERT INTO comment_reports (id,comment_id,visitor_hash,reason,status,created_at,reviewed_at,reviewed_by) VALUES (?,'root',?,'spam',?,?,?,?)",
    );
    for (const status of ["reviewed", "dismissed"]) {
      expect(() => insert.run(status, "a".repeat(64), status, timestamp, null, "editor")).toThrow();
      expect(() =>
        insert.run(status, "a".repeat(64), status, timestamp, "2025-01-01", "editor"),
      ).toThrow();
    }
    expect(() =>
      insert.run("open", "a".repeat(64), "open", timestamp, timestamp, "editor"),
    ).toThrow();
    expect(() =>
      insert.run("valid", "a".repeat(64), "reviewed", timestamp, timestamp, "editor"),
    ).not.toThrow();
  });
});
