import type { D1Database } from "../../../scripts/newsroom/storage/d1-types";
import { NEWSLETTER_CONSENT_VERSION } from "./contracts";

type PendingInput = {
  emailNormalized: string;
  emailHash: string;
  source: string;
};

type PendingRow = {
  id: string;
  email_normalized: string;
  email_hash: string;
  kit_subscriber_id: string | null;
  consent_version: string;
  consented_at: string;
  source: string;
  created_at: string;
};

type SubscriberRow = {
  id: string;
  email_normalized: string;
  consent_version: string;
  consented_at: string;
  source: string;
  created_at: string;
};

export class D1NewsletterRepository {
  constructor(
    private readonly database: D1Database,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async preparePending(input: PendingInput): Promise<{ active: boolean; id?: string }> {
    const active = await this.database
      .prepare(
        "SELECT id FROM newsletter_subscribers WHERE email_normalized=?1 AND status='active'",
      )
      .bind(input.emailNormalized)
      .first<{ id: string }>();
    if (active) return { active: true };

    const historical = await this.database
      .prepare("SELECT id FROM newsletter_subscribers WHERE email_normalized=?1")
      .bind(input.emailNormalized)
      .first<{ id: string }>();
    const current = await this.database
      .prepare("SELECT id,created_at FROM newsletter_kit_pending WHERE email_normalized=?1")
      .bind(input.emailNormalized)
      .first<{ id: string; created_at: string }>();
    const id = current?.id ?? historical?.id ?? this.id();
    const occurredAt = this.now().toISOString();
    await this.database.batch([
      this.database
        .prepare("DELETE FROM newsletter_suppressions WHERE email_hash=?1")
        .bind(input.emailHash),
      this.database
        .prepare(
          `INSERT INTO newsletter_kit_pending
          (id,email_normalized,email_hash,kit_subscriber_id,sync_status,consent_version,consented_at,source,last_attempt_at,created_at,updated_at)
          VALUES (?1,?2,?3,NULL,'queued',?4,?5,?6,NULL,?7,?5)
          ON CONFLICT(email_normalized) DO UPDATE SET
            email_hash=excluded.email_hash, kit_subscriber_id=NULL, sync_status='queued',
            consent_version=excluded.consent_version, consented_at=excluded.consented_at,
            source=excluded.source, last_attempt_at=NULL, updated_at=excluded.updated_at`,
        )
        .bind(
          id,
          input.emailNormalized,
          input.emailHash,
          NEWSLETTER_CONSENT_VERSION,
          occurredAt,
          input.source,
          current?.created_at ?? occurredAt,
        ),
      this.database
        .prepare(
          `INSERT INTO newsletter_consent_events
          (id,subscriber_id,email_hash,event_type,consent_version,source,occurred_at)
          VALUES (?1,?2,?3,'consent_recorded',?4,?5,?6)`,
        )
        .bind(
          this.id(),
          historical?.id ?? null,
          input.emailHash,
          NEWSLETTER_CONSENT_VERSION,
          input.source,
          occurredAt,
        ),
    ]);
    return { active: false, id };
  }

  async recordKitSubscriber(emailHash: string, kitSubscriberId: string): Promise<void> {
    const attemptedAt = this.now().toISOString();
    const result = await this.database
      .prepare(
        `UPDATE newsletter_kit_pending SET kit_subscriber_id=?1,sync_status='queued',
          last_attempt_at=?2,updated_at=?2 WHERE email_hash=?3`,
      )
      .bind(kitSubscriberId, attemptedAt, emailHash)
      .run();
    if (result.meta?.changes !== 1) throw new Error("Newsletter pending record unavailable.");
  }

  async markAssociated(emailHash: string): Promise<void> {
    const timestamp = this.now().toISOString();
    await this.database
      .prepare(
        `UPDATE newsletter_kit_pending SET sync_status='associated',last_attempt_at=?1,updated_at=?1
          WHERE email_hash=?2`,
      )
      .bind(timestamp, emailHash)
      .run();
  }

  async markSyncFailed(emailHash: string): Promise<void> {
    const timestamp = this.now().toISOString();
    await this.database
      .prepare(
        `UPDATE newsletter_kit_pending SET sync_status='failed',last_attempt_at=?1,updated_at=?1
          WHERE email_hash=?2`,
      )
      .bind(timestamp, emailHash)
      .run();
  }

  async webhookProcessed(eventId: string): Promise<boolean> {
    return Boolean(
      await this.database
        .prepare("SELECT event_id FROM newsletter_kit_webhook_events WHERE event_id=?1")
        .bind(eventId)
        .first(),
    );
  }

  async activate(input: {
    eventId: string;
    occurredAt: string;
    kitSubscriberId: string;
    emailNormalized: string;
    emailHash: string;
  }): Promise<void> {
    if (await this.webhookProcessed(input.eventId)) return;
    const pending = await this.findPending(input.kitSubscriberId, input.emailHash);
    if (!pending) {
      await this.recordWebhook(input.eventId, "subscriber.activated", input.occurredAt);
      return;
    }
    const processedAt = this.now().toISOString();
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO newsletter_subscribers
          (id,email_normalized,status,consent_version,consented_at,source,confirmation_token_hash,
            confirmation_expires_at,created_at,confirmed_at,updated_at,kit_subscriber_id)
          VALUES (?1,?2,'active',?3,?4,?5,NULL,NULL,?6,?7,?7,?8)
          ON CONFLICT(email_normalized) DO UPDATE SET
            status='active',consent_version=excluded.consent_version,
            consented_at=excluded.consented_at,source=excluded.source,
            confirmation_token_hash=NULL,confirmation_expires_at=NULL,
            confirmed_at=excluded.confirmed_at,updated_at=excluded.updated_at,
            kit_subscriber_id=excluded.kit_subscriber_id`,
        )
        .bind(
          pending.id,
          pending.email_normalized,
          pending.consent_version,
          pending.consented_at,
          pending.source,
          pending.created_at,
          input.occurredAt,
          input.kitSubscriberId,
        ),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO newsletter_consent_events
          (id,subscriber_id,email_hash,event_type,consent_version,source,occurred_at)
          VALUES (?1,?2,?3,'subscription_confirmed',?4,'kit-webhook',?5)`,
        )
        .bind(
          `${input.eventId}:confirmed`,
          pending.id,
          input.emailHash,
          pending.consent_version,
          input.occurredAt,
        ),
      this.database.prepare("DELETE FROM newsletter_kit_pending WHERE id=?1").bind(pending.id),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO newsletter_kit_webhook_events
          (event_id,event_type,occurred_at,processed_at) VALUES (?1,'subscriber.activated',?2,?3)`,
        )
        .bind(input.eventId, input.occurredAt, processedAt),
    ]);
  }

  async unsubscribe(input: {
    eventId: string;
    occurredAt: string;
    kitSubscriberId: string;
    emailNormalized: string;
    emailHash: string;
  }): Promise<void> {
    if (await this.webhookProcessed(input.eventId)) return;
    const subscriber = await this.findSubscriber(input.kitSubscriberId, input.emailNormalized);
    const processedAt = this.now().toISOString();
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO newsletter_consent_events
          (id,subscriber_id,email_hash,event_type,consent_version,source,occurred_at)
          VALUES (?1,?2,?3,'unsubscribed',?4,'kit-webhook',?5)`,
        )
        .bind(
          `${input.eventId}:unsubscribed`,
          subscriber?.id ?? null,
          input.emailHash,
          subscriber?.consent_version ?? NEWSLETTER_CONSENT_VERSION,
          input.occurredAt,
        ),
      this.database
        .prepare(
          `INSERT INTO newsletter_suppressions (email_hash,created_at) VALUES (?1,?2)
          ON CONFLICT(email_hash) DO UPDATE SET created_at=excluded.created_at`,
        )
        .bind(input.emailHash, input.occurredAt),
      this.database
        .prepare("DELETE FROM newsletter_kit_pending WHERE email_hash=?1")
        .bind(input.emailHash),
      this.database
        .prepare("DELETE FROM newsletter_subscribers WHERE email_normalized=?1")
        .bind(input.emailNormalized),
      this.database
        .prepare(
          `INSERT OR IGNORE INTO newsletter_kit_webhook_events
          (event_id,event_type,occurred_at,processed_at) VALUES (?1,'subscriber.unsubscribed',?2,?3)`,
        )
        .bind(input.eventId, input.occurredAt, processedAt),
    ]);
  }

  async recordWebhook(eventId: string, eventType: string, occurredAt: string): Promise<void> {
    await this.database
      .prepare(
        `INSERT OR IGNORE INTO newsletter_kit_webhook_events
        (event_id,event_type,occurred_at,processed_at) VALUES (?1,?2,?3,?4)`,
      )
      .bind(eventId, eventType, occurredAt, this.now().toISOString())
      .run();
  }

  private async findPending(
    kitSubscriberId: string,
    emailHash: string,
  ): Promise<PendingRow | null> {
    return this.database
      .prepare(
        `SELECT id,email_normalized,email_hash,kit_subscriber_id,consent_version,consented_at,source,created_at
        FROM newsletter_kit_pending WHERE kit_subscriber_id=?1 OR email_hash=?2 LIMIT 1`,
      )
      .bind(kitSubscriberId, emailHash)
      .first<PendingRow>();
  }

  private async findSubscriber(
    kitSubscriberId: string,
    emailNormalized: string,
  ): Promise<SubscriberRow | null> {
    return this.database
      .prepare(
        `SELECT id,email_normalized,consent_version,consented_at,source,created_at
        FROM newsletter_subscribers WHERE kit_subscriber_id=?1 OR email_normalized=?2 LIMIT 1`,
      )
      .bind(kitSubscriberId, emailNormalized)
      .first<SubscriberRow>();
  }
}
