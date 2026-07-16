CREATE TABLE IF NOT EXISTS newsroom_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsroom_documents (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsroom_audit (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  event_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsroom_sessions (
  id TEXT PRIMARY KEY,
  session_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS newsroom_rate_limits (
  key TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS newsroom_locks (
  key TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  run_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  fencing_token INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS newsroom_audit_timestamp ON newsroom_audit(timestamp);
CREATE INDEX IF NOT EXISTS newsroom_sessions_expiry ON newsroom_sessions(expires_at);
