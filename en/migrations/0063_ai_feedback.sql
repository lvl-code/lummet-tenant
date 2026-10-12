-- 0063_ai_feedback.sql
--
-- Thumbs up / down on Lummet AI answers. One row per rated answer (a visitor can change their mind).
-- Privacy: nothing identifying is stored (no user id, no IP). The question and answer text are kept ONLY for
-- thumbs-down, so editors can see what to fix; thumbs-up stores just the count. Rows are removed after 180 days.
-- Purely additive: one new table. The chat works without it (the thumbs simply do nothing).

CREATE TABLE IF NOT EXISTS ai_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    msg_ts INTEGER NOT NULL,          -- timestamp of the answer that was rated, so each answer is counted once
    rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
    reason TEXT,
    question TEXT,
    answer TEXT,
    country TEXT,
    reviewed INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (session_id, msg_ts)
);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON ai_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating, reviewed, created_at);
