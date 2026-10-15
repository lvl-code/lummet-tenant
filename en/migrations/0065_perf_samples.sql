-- Speed check (v22.3): a small sample of how long public pages took and whether
-- they came from the page cache. About 1 in 10 page views is recorded; rows older
-- than 14 days are removed automatically. Nothing else reads or depends on this table.
CREATE TABLE IF NOT EXISTS perf_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  path TEXT NOT NULL,
  route TEXT,
  state TEXT NOT NULL,        -- hit, stale or miss
  ms INTEGER NOT NULL,
  status INTEGER,
  country TEXT
);
CREATE INDEX IF NOT EXISTS idx_perf_samples_at ON perf_samples(at);
