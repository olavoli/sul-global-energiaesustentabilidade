import { z } from "zod";

export const newsletterStatusSchema = z.enum(["pending", "active"]);
export const NEWSLETTER_CONSENT_VERSION = "newsletter-v1";
export const newsletterConsentEventTypeSchema = z.enum([
  "consent_recorded",
  "subscription_confirmed",
  "unsubscribed",
]);

export const normalizedEmailSchema = z.string().trim().toLowerCase().pipe(z.email());

/**
 * Contrato criptográfico da newsletter:
 * - `confirmationTokenHash` é SHA-256 de token aleatório criptograficamente seguro;
 * - `emailHash` é HMAC-SHA-256 do e-mail normalizado, nunca SHA-256 simples;
 * - a chave HMAC virá de secret próprio, como `NEWSLETTER_HASH_SECRET`;
 * - token, e-mail e chave nunca podem ser registrados em logs.
 */
export const newsletterHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

const subscriberBaseSchema = z.object({
  id: z.string().min(1).max(128),
  emailNormalized: normalizedEmailSchema,
  consentVersion: z.string().min(1).max(64),
  consentedAt: z.iso.datetime(),
  source: z.string().min(1).max(120),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  kitSubscriberId: z.string().min(1).max(64).nullable().optional(),
});

export const newsletterSubscriberSchema = z.discriminatedUnion("status", [
  subscriberBaseSchema.extend({
    status: z.literal("pending"),
    confirmationTokenHash: newsletterHashSchema,
    confirmationExpiresAt: z.number().int().positive(),
    confirmedAt: z.null(),
  }),
  subscriberBaseSchema.extend({
    status: z.literal("active"),
    confirmationTokenHash: z.null(),
    confirmationExpiresAt: z.null(),
    confirmedAt: z.iso.datetime(),
  }),
]);

export const newsletterConsentEventSchema = z.object({
  id: z.string().min(1).max(128),
  subscriberId: z.string().min(1).max(128).nullable(),
  emailHash: newsletterHashSchema,
  eventType: newsletterConsentEventTypeSchema,
  consentVersion: z.string().min(1).max(64),
  source: z.string().min(1).max(120),
  occurredAt: z.iso.datetime(),
});

export const newsletterSuppressionSchema = z.object({
  emailHash: newsletterHashSchema,
  createdAt: z.iso.datetime(),
});

export const publicNewsletterSubscriptionSchema = z
  .object({
    email: normalizedEmailSchema,
    consentAccepted: z.literal(true),
    turnstileToken: z.string().trim().min(1).max(2_048),
    honeypot: z.string().max(120).default(""),
  })
  .strict();

export const newsletterKitPendingSchema = z.object({
  id: z.string().min(1).max(128),
  emailNormalized: normalizedEmailSchema,
  emailHash: newsletterHashSchema,
  kitSubscriberId: z.string().min(1).max(64).nullable(),
  syncStatus: z.enum(["queued", "associated", "failed"]),
  consentVersion: z.literal(NEWSLETTER_CONSENT_VERSION),
  consentedAt: z.iso.datetime(),
  source: z.string().min(1).max(120),
  lastAttemptAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const kitSubscriberEventSchema = z.object({
  subscriber: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    email_address: normalizedEmailSchema,
  }),
});

export const kitWebhookEnvelopeSchema = z.object({
  delivery_id: z.union([z.string(), z.number()]),
  events: z
    .array(
      z.object({
        id: z.uuid(),
        type: z.string().min(1).max(120),
        created: z.iso.datetime(),
        data: z.unknown(),
      }),
    )
    .min(1)
    .max(100),
});

export function parseKitSubscriberEvent(data: unknown) {
  return kitSubscriberEventSchema.safeParse(data);
}

export type NewsletterSubscriber = z.infer<typeof newsletterSubscriberSchema>;
export type NewsletterConsentEvent = z.infer<typeof newsletterConsentEventSchema>;
export type NewsletterSuppression = z.infer<typeof newsletterSuppressionSchema>;
export type PublicNewsletterSubscription = z.infer<typeof publicNewsletterSubscriptionSchema>;
export type NewsletterKitPending = z.infer<typeof newsletterKitPendingSchema>;
