import type { D1Database } from "./d1-types";

export interface StorageMigration {
  version: number;
  name: string;
  statements: string[];
}

export const storageMigrations: StorageMigration[] = [
  {
    version: 1,
    name: "newsroom-core",
    statements: [
      `CREATE TABLE IF NOT EXISTS newsroom_migrations (
        version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS newsroom_documents (
        key TEXT PRIMARY KEY, value_json TEXT NOT NULL, version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS newsroom_audit (
        id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, event_json TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS newsroom_sessions (
        id TEXT PRIMARY KEY, session_json TEXT NOT NULL, expires_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS newsroom_rate_limits (
        key TEXT PRIMARY KEY, state_json TEXT NOT NULL, expires_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS newsroom_locks (
        key TEXT PRIMARY KEY, owner TEXT NOT NULL, run_id TEXT NOT NULL,
        acquired_at TEXT NOT NULL, heartbeat_at TEXT NOT NULL, expires_at TEXT NOT NULL,
        fencing_token INTEGER NOT NULL
      )`,
      "CREATE INDEX IF NOT EXISTS newsroom_audit_timestamp ON newsroom_audit(timestamp)",
      "CREATE INDEX IF NOT EXISTS newsroom_sessions_expiry ON newsroom_sessions(expires_at)",
    ],
  },
  {
    version: 2,
    name: "newsletter-subscribers",
    statements: [
      `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id TEXT PRIMARY KEY,
        email_normalized TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
        consent_version TEXT NOT NULL,
        consented_at TEXT NOT NULL,
        source TEXT NOT NULL,
        confirmation_token_hash TEXT CHECK (
          confirmation_token_hash IS NULL OR (
            length(confirmation_token_hash) = 64
            AND confirmation_token_hash NOT GLOB '*[^0-9a-f]*'
          )
        ),
        confirmation_expires_at INTEGER,
        created_at TEXT NOT NULL,
        confirmed_at TEXT,
        updated_at TEXT NOT NULL,
        CHECK (
          (status = 'pending' AND confirmation_token_hash IS NOT NULL
            AND confirmation_expires_at IS NOT NULL AND confirmed_at IS NULL)
          OR
          (status = 'active' AND confirmation_token_hash IS NULL
            AND confirmation_expires_at IS NULL AND confirmed_at IS NOT NULL)
        )
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email
        ON newsletter_subscribers(email_normalized)`,
      `CREATE INDEX IF NOT EXISTS newsletter_subscribers_status
        ON newsletter_subscribers(status)`,
      `CREATE INDEX IF NOT EXISTS newsletter_subscribers_pending_expiry
        ON newsletter_subscribers(confirmation_expires_at) WHERE status = 'pending'`,
      `CREATE TABLE IF NOT EXISTS newsletter_consent_events (
        id TEXT PRIMARY KEY,
        subscriber_id TEXT,
        email_hash TEXT NOT NULL CHECK (
          length(email_hash) = 64 AND email_hash NOT GLOB '*[^0-9a-f]*'
        ),
        event_type TEXT NOT NULL CHECK (
          event_type IN ('consent_recorded', 'subscription_confirmed', 'unsubscribed')
        ),
        consent_version TEXT NOT NULL,
        source TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS newsletter_consent_events_subscriber
        ON newsletter_consent_events(subscriber_id)`,
      `CREATE INDEX IF NOT EXISTS newsletter_consent_events_email_hash
        ON newsletter_consent_events(email_hash)`,
      `CREATE INDEX IF NOT EXISTS newsletter_consent_events_occurred_at
        ON newsletter_consent_events(occurred_at)`,
      `CREATE TABLE IF NOT EXISTS newsletter_suppressions (
        email_hash TEXT PRIMARY KEY CHECK (
          length(email_hash) = 64 AND email_hash NOT GLOB '*[^0-9a-f]*'
        ),
        created_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 3,
    name: "public-comments",
    statements: [
      `CREATE TABLE IF NOT EXISTS public_comments (
        id TEXT PRIMARY KEY,
        article_slug TEXT NOT NULL,
        status TEXT NOT NULL CHECK (
          status IN ('pending', 'approved', 'rejected', 'spam', 'deleted')
        ),
        public_name TEXT,
        email_normalized TEXT,
        email_hash TEXT NOT NULL CHECK (
          length(email_hash) = 64 AND email_hash NOT GLOB '*[^0-9a-f]*'
        ),
        body_text TEXT,
        consent_version TEXT NOT NULL CHECK (consent_version = 'comments-v1'),
        consented_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        approved_at TEXT,
        rejected_at TEXT,
        deleted_at TEXT,
        anonymized_at TEXT,
        CHECK (
          (public_name IS NOT NULL AND email_normalized IS NOT NULL AND body_text IS NOT NULL)
          OR
          (public_name IS NULL AND email_normalized IS NULL AND body_text IS NULL)
        ),
        CHECK (
          (
            status = 'pending'
            AND public_name IS NOT NULL
            AND approved_at IS NULL AND rejected_at IS NULL AND deleted_at IS NULL
            AND anonymized_at IS NULL
          )
          OR
          (
            status = 'approved'
            AND public_name IS NOT NULL
            AND approved_at IS NOT NULL AND rejected_at IS NULL AND deleted_at IS NULL
            AND anonymized_at IS NULL
          )
          OR
          (
            status IN ('rejected', 'spam')
            AND rejected_at IS NOT NULL AND approved_at IS NULL AND deleted_at IS NULL
            AND (
              (public_name IS NOT NULL AND anonymized_at IS NULL)
              OR
              (public_name IS NULL AND anonymized_at IS NOT NULL)
            )
          )
          OR
          (
            status = 'deleted'
            AND public_name IS NULL
            AND approved_at IS NULL AND rejected_at IS NULL AND deleted_at IS NOT NULL
            AND anonymized_at IS NOT NULL
          )
        ),
        CHECK (consented_at <= created_at AND created_at <= updated_at),
        CHECK (approved_at IS NULL OR (created_at <= approved_at AND approved_at <= updated_at)),
        CHECK (rejected_at IS NULL OR (created_at <= rejected_at AND rejected_at <= updated_at)),
        CHECK (deleted_at IS NULL OR (created_at <= deleted_at AND deleted_at <= updated_at)),
        CHECK (
          anonymized_at IS NULL OR (
            created_at <= anonymized_at
            AND anonymized_at <= updated_at
            AND (rejected_at IS NULL OR rejected_at <= anonymized_at)
            AND (deleted_at IS NULL OR deleted_at <= anonymized_at)
          )
        )
      )`,
      `CREATE INDEX IF NOT EXISTS public_comments_article_status_approved
        ON public_comments(article_slug, status, approved_at, id)`,
      `CREATE INDEX IF NOT EXISTS public_comments_status_created
        ON public_comments(status, created_at)`,
      `CREATE INDEX IF NOT EXISTS public_comments_email_hash
        ON public_comments(email_hash)`,
      `CREATE TABLE IF NOT EXISTS comment_moderation_events (
        id TEXT PRIMARY KEY,
        comment_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'spam', 'delete')),
        actor TEXT NOT NULL CHECK (length(trim(actor)) BETWEEN 1 AND 128),
        reason TEXT CHECK (reason IS NULL OR length(reason) BETWEEN 1 AND 500),
        created_at TEXT NOT NULL,
        FOREIGN KEY (comment_id) REFERENCES public_comments(id) ON DELETE RESTRICT
      )`,
      `CREATE INDEX IF NOT EXISTS comment_moderation_events_comment_created
        ON comment_moderation_events(comment_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS comment_moderation_events_actor_created
        ON comment_moderation_events(actor, created_at)`,
    ],
  },
];

export function validateMigrations(migrations: StorageMigration[]): void {
  let previous = 0;
  for (const migration of migrations) {
    if (migration.version <= previous)
      throw new Error("Migrations devem ter versões únicas e crescentes.");
    if (!migration.name.trim() || !migration.statements.length)
      throw new Error(`Migration ${migration.version} está incompleta.`);
    if (migration.statements.some((statement) => /\bDROP\s+(?:TABLE|INDEX)\b/i.test(statement)))
      throw new Error(`Migration ${migration.version} contém operação destrutiva.`);
    previous = migration.version;
  }
}

export async function migrationStatus(database: D1Database): Promise<{
  applied: number[];
  pending: StorageMigration[];
}> {
  validateMigrations(storageMigrations);
  await database.exec(storageMigrations[0].statements[0]);
  const result = await database
    .prepare("SELECT version FROM newsroom_migrations ORDER BY version")
    .all<{ version: number }>();
  const applied = (result.results ?? []).map(({ version }) => version);
  return {
    applied,
    pending: storageMigrations.filter(({ version }) => !applied.includes(version)),
  };
}

export async function applyMigrations(database: D1Database): Promise<number[]> {
  validateMigrations(storageMigrations);
  const status = await migrationStatus(database);
  for (const migration of status.pending) {
    const statements = migration.statements.map((sql) => database.prepare(sql));
    statements.push(
      database
        .prepare("INSERT INTO newsroom_migrations (version,name,applied_at) VALUES (?1,?2,?3)")
        .bind(migration.version, migration.name, new Date().toISOString()),
    );
    const result = await database.batch(statements);
    if (result.some(({ success }) => !success))
      throw new Error(`Migration ${migration.version} falhou.`);
  }
  return status.pending.map(({ version }) => version);
}
