-- =====================================================
-- LUMMET AI — Database Migration
-- Run: wrangler d1 execute <DB_NAME> --file=worker/database/schema-lummet.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id INTEGER,
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at);

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (ip_hash, created_at)
);
