import { describe, expect, test } from "bun:test";

import {
  newsletterConsentEventSchema,
  newsletterSubscriberSchema,
  newsletterSuppressionSchema,
  normalizedEmailSchema,
} from "./contracts";

const timestamp = "2026-09-11T12:00:00.000Z";
const hash = "a".repeat(64);

describe("contratos da newsletter", () => {
  test("normaliza o e-mail", () => {
    expect(normalizedEmailSchema.parse(" Leitor@Example.COM ")).toBe("leitor@example.com");
  });

  test("pending exige somente o hash e a expiração do token", () => {
    const subscriber = newsletterSubscriberSchema.parse({
      id: "subscriber-1",
      emailNormalized: "leitor@example.com",
      status: "pending",
      consentVersion: "2026-09",
      consentedAt: timestamp,
      source: "newsletter-cta",
      confirmationTokenHash: hash,
      confirmationExpiresAt: Date.now() + 3_600_000,
      confirmedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(subscriber.status).toBe("pending");
    expect(subscriber).not.toHaveProperty("confirmationToken");
  });

  test("active não preserva credencial de confirmação", () => {
    expect(() =>
      newsletterSubscriberSchema.parse({
        id: "subscriber-1",
        emailNormalized: "leitor@example.com",
        status: "active",
        consentVersion: "2026-09",
        consentedAt: timestamp,
        source: "newsletter-cta",
        confirmationTokenHash: hash,
        confirmationExpiresAt: Date.now() + 3_600_000,
        confirmedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ).toThrow();
  });

  test("evento e supressão aceitam somente hash SHA-256", () => {
    expect(
      newsletterConsentEventSchema.parse({
        id: "event-1",
        subscriberId: null,
        emailHash: hash,
        eventType: "unsubscribed",
        consentVersion: "2026-09",
        source: "unsubscribe-link",
        occurredAt: timestamp,
      }).emailHash,
    ).toBe(hash);
    expect(newsletterSuppressionSchema.parse({ emailHash: hash, createdAt: timestamp })).toEqual({
      emailHash: hash,
      createdAt: timestamp,
    });
    expect(() =>
      newsletterSuppressionSchema.parse({ emailHash: "leitor@example.com", createdAt: timestamp }),
    ).toThrow();
    expect(() =>
      newsletterSuppressionSchema.parse({ emailHash: "A".repeat(64), createdAt: timestamp }),
    ).toThrow();
  });
});
