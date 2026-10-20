-- =====================================================
-- 0014: Platform operations
-- =====================================================
-- Control-plane (super API) nonces, rate limits and audit log, and performance
-- samples.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- super_api_nonces
CREATE TABLE IF NOT EXISTS super_api_nonces (
  nonce TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (credential_id, nonce)
);
CREATE INDEX IF NOT EXISTS idx_super_nonces_created ON super_api_nonces(created_at);

-- ----- super_api_rate_limits
CREATE TABLE IF NOT EXISTS super_api_rate_limits (
  credential_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (credential_id, created_at)
);

-- ----- super_audit_logs
CREATE TABLE IF NOT EXISTS super_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  action TEXT,
  success INTEGER NOT NULL,
  status_code INTEGER,
  request_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_super_audit_created ON super_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_super_audit_credential ON super_audit_logs(credential_id);

-- ----- perf_samples
CREATE TABLE IF NOT EXISTS perf_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  path TEXT NOT NULL,
  route TEXT,
  state TEXT NOT NULL,
  ms INTEGER NOT NULL,
  status INTEGER,
  country TEXT
);
CREATE INDEX IF NOT EXISTS idx_perf_samples_at ON perf_samples(at);
