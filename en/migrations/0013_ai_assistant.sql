-- =====================================================
-- 0013: AI assistant and AI Studio
-- =====================================================
-- Generation log, assistant conversations, rate limits, the free-tier gate, AI
-- Studio history and answer feedback.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- ai_generations
CREATE TABLE IF NOT EXISTS ai_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_slug TEXT NOT NULL,
  prompt TEXT,
  model TEXT,
  status TEXT DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_entity ON ai_generations(entity_slug);

-- ----- ai_conversations
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

-- ----- ai_rate_limits
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (ip_hash, created_at)
);

-- ----- ai_free_tier_usage
CREATE TABLE IF NOT EXISTS ai_free_tier_usage (
  ip_hash TEXT PRIMARY KEY,
  message_count INTEGER NOT NULL DEFAULT 0,
  first_message_at TEXT,
  last_message_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_free_tier_last ON ai_free_tier_usage(last_message_at);

-- ----- ai_studio_history
CREATE TABLE IF NOT EXISTS ai_studio_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_label TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('generate', 'save')),
  task TEXT,
  target TEXT,
  item_type TEXT,
  item_key TEXT,
  outcome TEXT NOT NULL DEFAULT 'ok' CHECK (outcome IN ('ok', 'failed')),
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_studio_history_created ON ai_studio_history(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_studio_history_user ON ai_studio_history(user_id, created_at);

-- ----- ai_feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  msg_ts INTEGER NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  reason TEXT,
  question TEXT,
  answer TEXT,
  country TEXT,
  reviewed INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  source TEXT,
  UNIQUE (session_id, msg_ts)
);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON ai_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating, reviewed, created_at);
