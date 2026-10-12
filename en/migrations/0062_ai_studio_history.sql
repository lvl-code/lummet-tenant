-- 0062_ai_studio_history.sql
--
-- A short record of what people did in AI Studio: which tool was run, what was saved and where, by whom, when.
-- It stores NO prompts and NO generated text, only the tool name, the target item or slug and a one-line outcome.
-- Purely additive: one new table, nothing existing is touched. AI Studio keeps working if this is not applied yet
-- (history is then simply empty).

CREATE TABLE IF NOT EXISTS ai_studio_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_label TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('generate', 'save')),
    task TEXT,           -- tool id for 'generate' (e.g. research_draft)
    target TEXT,         -- save target for 'save' (news_draft, research_draft, research_claims, item_fields)
    item_type TEXT,
    item_key TEXT,
    outcome TEXT NOT NULL DEFAULT 'ok' CHECK (outcome IN ('ok', 'failed')),
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_studio_history_created ON ai_studio_history(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_studio_history_user ON ai_studio_history(user_id, created_at);
