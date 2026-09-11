import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { storageMigrations, validateMigrations } from "./migrations";

const sql = readFileSync(new URL("./0003_public_comments.sql", import.meta.url), "utf8");
const commentsMigration = storageMigrations.find(({ version }) => version === 3);

describe("migration de comentários públicos", () => {
  test("registra a versão 3 depois da newsletter e mantém versões crescentes", () => {
    expect(() => validateMigrations(storageMigrations)).not.toThrow();
    expect(storageMigrations.map(({ version }) => version)).toEqual([1, 2, 3]);
    expect(commentsMigration).toMatchObject({ version: 3, name: "public-comments" });
  });

  test("usa somente criação idempotente e nenhuma operação destrutiva", () => {
    expect(sql).not.toMatch(
      /^\s*(?:DROP\b|DELETE\s+FROM\b|ALTER\b|UPDATE\b|REPLACE\b|TRUNCATE\b)/im,
    );
    expect(sql.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(2);
    expect(sql.match(/CREATE INDEX IF NOT EXISTS/g)).toHaveLength(5);
  });

  test("mantém comentários e eventos separados das tabelas genéricas da newsroom", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public_comments");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS comment_moderation_events");
    expect(sql).not.toContain("newsroom_documents");
    expect(sql).not.toMatch(/FOREIGN KEY \(article_slug\)/i);
  });

  test("restringe status, ações, versão de consentimento e hash", () => {
    expect(sql).toContain("status IN ('pending', 'approved', 'rejected', 'spam', 'deleted')");
    expect(sql).toContain("action IN ('approve', 'reject', 'spam', 'delete')");
    expect(sql).toContain("consent_version = 'comments-v1'");
    expect(sql).toContain("length(email_hash) = 64");
    expect(sql).toContain("email_hash NOT GLOB '*[^0-9a-f]*'");
  });

  test("impede PII parcial e modela todos os estados retidos ou anonimizados", () => {
    expect(sql).toContain(
      "public_name IS NOT NULL AND email_normalized IS NOT NULL AND body_text IS NOT NULL",
    );
    expect(sql).toContain("public_name IS NULL AND email_normalized IS NULL AND body_text IS NULL");
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("status = 'approved'");
    expect(sql).toContain("status IN ('rejected', 'spam')");
    expect(sql).toContain("status = 'deleted'");
    expect(sql).toContain("public_name IS NULL AND anonymized_at IS NOT NULL");
  });

  test("cria todos os índices mínimos", () => {
    expect(sql).toContain("ON public_comments(article_slug, status, approved_at, id)");
    expect(sql).toContain("ON public_comments(status, created_at)");
    expect(sql).toContain("ON public_comments(email_hash)");
    expect(sql).toContain("ON comment_moderation_events(comment_id, created_at)");
    expect(sql).toContain("ON comment_moderation_events(actor, created_at)");
  });

  test("limita o motivo e mantém PII fora do log de moderação", () => {
    const eventTable = sql.match(
      /CREATE TABLE IF NOT EXISTS comment_moderation_events[\s\S]*?\n\);/,
    )?.[0];
    expect(eventTable).toBeDefined();
    expect(eventTable).toContain("length(reason) BETWEEN 1 AND 500");
    expect(eventTable).toContain("FOREIGN KEY (comment_id) REFERENCES public_comments(id)");
    expect(eventTable).not.toMatch(/public_name|email(?:_normalized|_hash)?|body_text|\bip\b/i);
  });

  test("mantém o SQL versionado equivalente ao registro executável", () => {
    expect(commentsMigration).toBeDefined();
    const normalize = (statement: string) => statement.replace(/\s+/g, " ").trim();
    const normalizedFileStatements = sql.split(";").map(normalize).filter(Boolean);
    expect(commentsMigration?.statements.map(normalize)).toEqual(normalizedFileStatements);
  });
});
