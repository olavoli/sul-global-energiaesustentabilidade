import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { LocalCommentDatabase } from "../../../src/lib/comments/test-database";
import { applyMigrations, storageMigrations } from "./migrations";

const sql = readFileSync(new URL("./0005_newsletter_kit.sql", import.meta.url), "utf8");
const migration = storageMigrations.find(({ version }) => version === 5);
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

describe("migration 5 da newsletter com Kit", () => {
  test("é aditiva, versionada depois do baseline e equivalente ao SQL", () => {
    expect(storageMigrations.map(({ version }) => version)).toEqual([1, 2, 3, 4, 5]);
    expect(migration).toMatchObject({ version: 5, name: "newsletter-kit" });
    expect(migration?.statements.map(normalize)).toEqual(
      sql.split(";").map(normalize).filter(Boolean),
    );
    expect(sql).not.toMatch(/\b(?:DROP|TRUNCATE|REPLACE)\b|DELETE\s+FROM/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE[^;]+(?:RENAME|DROP)/i);
  });

  test("aplica 1→5 em banco vazio e não reaplica", async () => {
    const database = new LocalCommentDatabase(0);
    expect(await applyMigrations(database)).toEqual([1, 2, 3, 4, 5]);
    expect(await applyMigrations(database)).toEqual([]);
    expect(database.sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  test("aplica 5 sobre 1→4 e preserva assinantes históricos", async () => {
    const database = new LocalCommentDatabase(4);
    for (const prior of storageMigrations.slice(0, 4))
      database.sqlite
        .query("INSERT INTO newsroom_migrations VALUES (?,?,?)")
        .run(prior.version, prior.name, "2026-01-01T00:00:00.000Z");
    const timestamp = "2026-01-01T00:00:00.000Z";
    database.sqlite
      .query(
        `INSERT INTO newsletter_subscribers
        (id,email_normalized,status,consent_version,consented_at,source,confirmation_token_hash,
          confirmation_expires_at,created_at,confirmed_at,updated_at)
        VALUES ('historical','historical@example.com','pending','legacy-v1',?,'legacy',?,1893456000000,?,NULL,?)`,
      )
      .run(timestamp, "a".repeat(64), timestamp, timestamp);
    const before = database.sqlite
      .query("SELECT * FROM newsletter_subscribers WHERE id='historical'")
      .get() as Record<string, unknown>;
    expect(await applyMigrations(database)).toEqual([5]);
    const after = database.sqlite
      .query("SELECT * FROM newsletter_subscribers WHERE id='historical'")
      .get() as Record<string, unknown>;
    expect(after).toMatchObject(before);
    expect(after.kit_subscriber_id).toBeNull();
  });

  test("aceita pending Kit sem token local e exige hash/estado coerentes", () => {
    const database = new LocalCommentDatabase(5);
    const timestamp = "2026-10-06T12:00:00.000Z";
    const insert = database.sqlite.query(
      `INSERT INTO newsletter_kit_pending
      (id,email_normalized,email_hash,kit_subscriber_id,sync_status,consent_version,consented_at,
        source,last_attempt_at,created_at,updated_at)
      VALUES (?,?,?,?,?,'newsletter-v1',?,'newsletter-cta',NULL,?,?)`,
    );
    expect(() =>
      insert.run(
        "pending",
        "reader@example.com",
        "a".repeat(64),
        null,
        "queued",
        timestamp,
        timestamp,
        timestamp,
      ),
    ).not.toThrow();
    expect(() =>
      insert.run(
        "invalid",
        "other@example.com",
        "A".repeat(64),
        null,
        "unknown",
        timestamp,
        timestamp,
        timestamp,
      ),
    ).toThrow();
  });

  test("falha na migration reverte o ALTER e o registro de versão", async () => {
    const database = new LocalCommentDatabase(4);
    for (const prior of storageMigrations.slice(0, 4))
      database.sqlite
        .query("INSERT INTO newsroom_migrations VALUES (?,?,?)")
        .run(prior.version, prior.name, "2026-01-01T00:00:00.000Z");
    database.sqlite.query("CREATE TABLE newsletter_subscribers_kit_id(id TEXT)").run();
    await expect(applyMigrations(database)).rejects.toThrow();
    const columns = database.sqlite
      .query("PRAGMA table_info(newsletter_subscribers)")
      .all() as Array<{ name: string }>;
    expect(columns.map(({ name }) => name)).not.toContain("kit_subscriber_id");
    expect(
      database.sqlite.query("SELECT version FROM newsroom_migrations WHERE version=5").get(),
    ).toBeNull();
  });
});
