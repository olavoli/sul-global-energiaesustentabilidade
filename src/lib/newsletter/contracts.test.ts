import { describe, expect, test } from "bun:test";

import {
  newsletterConsentEventSchema,
  newsletterKitPendingSchema,
  newsletterSubscriberSchema,
  newsletterSuppressionSchema,
  normalizedEmailSchema,
  publicNewsletterSubscriptionSchema,
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

  test("entrada pública é estrita, normaliza e exige consentimento", () => {
    expect(
      publicNewsletterSubscriptionSchema.parse({
        email: " Leitor@Example.COM ",
        consentAccepted: true,
        turnstileToken: "token",
        honeypot: "",
      }).email,
    ).toBe("leitor@example.com");
    expect(() =>
      publicNewsletterSubscriptionSchema.parse({
        email: "leitor@example.com",
        consentAccepted: false,
        turnstileToken: "token",
        honeypot: "",
      }),
    ).toThrow();
    expect(() =>
      publicNewsletterSubscriptionSchema.parse({
        email: "leitor@example.com",
        consentAccepted: true,
        turnstileToken: "token",
        honeypot: "",
        status: "active",
      }),
    ).toThrow();
  });

  test("pending Kit não contém token de confirmação local", () => {
    const pending = newsletterKitPendingSchema.parse({
      id: "pending-1",
      emailNormalized: "leitor@example.com",
      emailHash: hash,
      kitSubscriberId: null,
      syncStatus: "queued",
      consentVersion: "newsletter-v1",
      consentedAt: timestamp,
      source: "newsletter-cta",
      lastAttemptAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    expect(pending).not.toHaveProperty("confirmationTokenHash");
  });
});
