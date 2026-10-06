ALTER TABLE newsletter_subscribers ADD COLUMN kit_subscriber_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_kit_id
  ON newsletter_subscribers(kit_subscriber_id)
  WHERE kit_subscriber_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS newsletter_kit_pending (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  email_hash TEXT NOT NULL CHECK (
    length(email_hash) = 64 AND email_hash NOT GLOB '*[^0-9a-f]*'
  ),
  kit_subscriber_id TEXT,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('queued', 'associated', 'failed')),
  consent_version TEXT NOT NULL CHECK (consent_version = 'newsletter-v1'),
  consented_at TEXT NOT NULL,
  source TEXT NOT NULL,
  last_attempt_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (created_at <= updated_at),
  CHECK (consented_at <= updated_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_kit_pending_provider
  ON newsletter_kit_pending(kit_subscriber_id)
  WHERE kit_subscriber_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS newsletter_kit_pending_sync
  ON newsletter_kit_pending(sync_status, updated_at);

CREATE INDEX IF NOT EXISTS newsletter_kit_pending_email_hash
  ON newsletter_kit_pending(email_hash);

CREATE TABLE IF NOT EXISTS newsletter_kit_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS newsletter_kit_webhook_events_processed
  ON newsletter_kit_webhook_events(processed_at);
