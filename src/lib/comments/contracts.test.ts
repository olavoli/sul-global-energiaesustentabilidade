import { describe, expect, test } from "bun:test";

import {
  COMMENTS_CONSENT_VERSION,
  commentEmailHashSchema,
  persistedCommentSchema,
  publicCommentInputSchema,
} from "./contracts";

const timestamp = "2026-09-11T12:00:00.000Z";
const laterTimestamp = "2026-09-11T13:00:00.000Z";
const afterRetentionTimestamp = "2026-12-10T12:00:00.000Z";
const hash = "a".repeat(64);

const publicInput = {
  articleSlug: "artigo-publicado",
  publicName: "Leitora",
  email: "leitora@example.com",
  bodyText: "Comentário respeitoso.",
  consentAccepted: true,
  honeypot: "",
  turnstileToken: "token-de-teste",
} as const;

const persistedBase = {
  id: "comment-1",
  articleSlug: "artigo-publicado",
  publicName: "Leitora",
  emailNormalized: "leitora@example.com",
  emailHash: hash,
  bodyText: "Comentário respeitoso.",
  consentVersion: COMMENTS_CONSENT_VERSION,
  consentedAt: timestamp,
  createdAt: timestamp,
  updatedAt: laterTimestamp,
};

describe("contrato de comentários públicos", () => {
  test("normaliza o e-mail", () => {
    expect(
      publicCommentInputSchema.parse({ ...publicInput, email: " Leitora@Example.COM " }).email,
    ).toBe("leitora@example.com");
  });

  test("exige consentimento literal e não recebe a versão controlada pelo servidor", () => {
    expect(() =>
      publicCommentInputSchema.parse({ ...publicInput, consentAccepted: false }),
    ).toThrow();
    expect(publicCommentInputSchema.parse(publicInput)).not.toHaveProperty("consentVersion");
    expect(() =>
      publicCommentInputSchema.parse({ ...publicInput, consentVersion: "comments-v2" }),
    ).toThrow();
  });

  test("aplica os limites de nome e comentário", () => {
    expect(() => publicCommentInputSchema.parse({ ...publicInput, publicName: "A" })).toThrow();
    expect(() =>
      publicCommentInputSchema.parse({ ...publicInput, publicName: "A".repeat(61) }),
    ).toThrow();
    expect(() => publicCommentInputSchema.parse({ ...publicInput, bodyText: "Oi" })).toThrow();
    expect(() =>
      publicCommentInputSchema.parse({ ...publicInput, bodyText: "A".repeat(2_001) }),
    ).toThrow();
  });

  test("rejeita tags HTML sem interpretar Markdown", () => {
    expect(() =>
      publicCommentInputSchema.parse({ ...publicInput, bodyText: "Olá <strong>mundo</strong>" }),
    ).toThrow();
    expect(
      publicCommentInputSchema.parse({ ...publicInput, bodyText: "**Texto literal**" }).bodyText,
    ).toBe("**Texto literal**");
  });

  test("aceita somente hash hexadecimal minúsculo com 64 caracteres", () => {
    expect(commentEmailHashSchema.parse(hash)).toBe(hash);
    expect(() => commentEmailHashSchema.parse("A".repeat(64))).toThrow();
    expect(() => commentEmailHashSchema.parse("a".repeat(63))).toThrow();
  });

  test.each([
    ["pending", null, null, null],
    ["approved", laterTimestamp, null, null],
    ["rejected", null, laterTimestamp, null],
    ["spam", null, laterTimestamp, null],
  ] as const)("aceita o estado retido %s", (status, approvedAt, rejectedAt, deletedAt) => {
    expect(
      persistedCommentSchema.parse({
        ...persistedBase,
        status,
        approvedAt,
        rejectedAt,
        deletedAt,
        anonymizedAt: null,
      }).status,
    ).toBe(status);
  });

  test.each(["rejected", "spam"] as const)("aceita o estado %s anonimizado", (status) => {
    expect(
      persistedCommentSchema.parse({
        ...persistedBase,
        status,
        publicName: null,
        emailNormalized: null,
        bodyText: null,
        approvedAt: null,
        rejectedAt: timestamp,
        deletedAt: null,
        anonymizedAt: afterRetentionTimestamp,
        updatedAt: afterRetentionTimestamp,
      }).status,
    ).toBe(status);
  });

  test("aceita deleted anonimizado e rejeita PII residual", () => {
    const deleted = {
      ...persistedBase,
      status: "deleted",
      approvedAt: null,
      rejectedAt: null,
      deletedAt: timestamp,
      anonymizedAt: laterTimestamp,
    } as const;

    expect(() => persistedCommentSchema.parse(deleted)).toThrow();
    expect(
      persistedCommentSchema.parse({
        ...deleted,
        publicName: null,
        emailNormalized: null,
        bodyText: null,
      }).status,
    ).toBe("deleted");
  });

  test("rejeita combinações parciais de PII", () => {
    expect(() =>
      persistedCommentSchema.parse({
        ...persistedBase,
        status: "spam",
        publicName: null,
        rejectedAt: timestamp,
        approvedAt: null,
        deletedAt: null,
        anonymizedAt: afterRetentionTimestamp,
        updatedAt: afterRetentionTimestamp,
      }),
    ).toThrow();
  });

  test("exige honeypot vazio quando informado", () => {
    expect(publicCommentInputSchema.parse({ ...publicInput, honeypot: undefined })).toBeDefined();
    expect(() => publicCommentInputSchema.parse({ ...publicInput, honeypot: "site" })).toThrow();
  });

  test("rejeita timestamps incompatíveis com estado e cronologia", () => {
    expect(() =>
      persistedCommentSchema.parse({
        ...persistedBase,
        status: "approved",
        approvedAt: null,
        rejectedAt: null,
        deletedAt: null,
        anonymizedAt: null,
      }),
    ).toThrow();
    expect(() =>
      persistedCommentSchema.parse({
        ...persistedBase,
        status: "pending",
        approvedAt: laterTimestamp,
        rejectedAt: null,
        deletedAt: null,
        anonymizedAt: null,
      }),
    ).toThrow();
    expect(() =>
      persistedCommentSchema.parse({
        ...persistedBase,
        status: "approved",
        approvedAt: "2026-09-11T11:00:00.000Z",
        rejectedAt: null,
        deletedAt: null,
        anonymizedAt: null,
      }),
    ).toThrow();
  });

  test("valida a cronologia de anonymizedAt", () => {
    const anonymizedRejected = {
      ...persistedBase,
      status: "rejected",
      publicName: null,
      emailNormalized: null,
      bodyText: null,
      approvedAt: null,
      rejectedAt: timestamp,
      deletedAt: null,
      anonymizedAt: "2026-09-11T11:00:00.000Z",
    } as const;

    expect(() => persistedCommentSchema.parse(anonymizedRejected)).toThrow();
    expect(() =>
      persistedCommentSchema.parse({
        ...anonymizedRejected,
        anonymizedAt: laterTimestamp,
        updatedAt: timestamp,
      }),
    ).toThrow();
  });
});
