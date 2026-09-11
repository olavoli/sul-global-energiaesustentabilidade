import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { storageMigrations, validateMigrations } from "./migrations";

const sql = readFileSync(new URL("./0002_newsletter_subscribers.sql", import.meta.url), "utf8");

describe("migration da newsletter", () => {
  test("registra a versão 2 sem operação destrutiva", () => {
    expect(() => validateMigrations(storageMigrations)).not.toThrow();
    expect(storageMigrations.find(({ version }) => version === 2)).toMatchObject({
      version: 2,
      name: "newsletter-subscribers",
    });
  });

  test("mantém assinantes, consentimentos e supressões fora de newsroom_documents", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS newsletter_subscribers");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS newsletter_consent_events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS newsletter_suppressions");
    expect(sql).not.toContain("newsroom_documents");
  });

  test("indexa e permite eliminar inscrições pending expiradas", () => {
    expect(sql).toContain("newsletter_subscribers_email");
    expect(sql).toContain("newsletter_subscribers_status");
    expect(sql).toContain("newsletter_subscribers_pending_expiry");
    expect(sql).toContain("confirmation_expires_at");
    expect(sql).toContain("WHERE status = 'pending'");
  });

  test("não possui coluna para token em texto puro", () => {
    expect(sql).toContain("confirmation_token_hash TEXT");
    expect(sql).not.toMatch(/\bconfirmation_token\s+TEXT\b/);
  });

  test("restringe todos os hashes a 64 caracteres hexadecimais minúsculos", () => {
    expect(sql.match(/length\(confirmation_token_hash\) = 64/g)).toHaveLength(1);
    expect(sql.match(/confirmation_token_hash NOT GLOB '\*\[\^0-9a-f\]\*'/g)).toHaveLength(1);
    expect(sql.match(/length\(email_hash\) = 64/g)).toHaveLength(2);
    expect(sql.match(/email_hash NOT GLOB '\*\[\^0-9a-f\]\*'/g)).toHaveLength(2);
  });
});
