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
