-- 0064_ai_feedback_source.sql
--
-- Records which entrance a rating came from: the floating widget ('widget') or the lummet.<domain> page ('subdomain').
-- Filled in by the server from the request address, never from the browser. Older rows stay empty.
-- Purely additive: one new nullable column. Run it once per site database (a second run reports "duplicate column name", which is harmless).
-- Until it is run, ratings are still saved, just without the entrance.

ALTER TABLE ai_feedback ADD COLUMN source TEXT;
