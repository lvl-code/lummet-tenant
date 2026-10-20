-- =====================================================
-- 0008: Reporting and email campaigns
-- =====================================================
-- Report definitions, schedules, recipients and runs, and email campaigns.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- report_definitions
CREATE TABLE IF NOT EXISTS report_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  filters_json TEXT,
  columns_json TEXT,
  grouping_json TEXT,
  sort_json TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_definitions_owner ON report_definitions(owner_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_type ON report_definitions(report_type);

-- ----- report_schedules
CREATE TABLE IF NOT EXISTS report_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  next_run_at DATETIME,
  enabled INTEGER NOT NULL DEFAULT 1,
  output_format TEXT NOT NULL DEFAULT 'csv',
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_schedules_due ON report_schedules(enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_report_schedules_report ON report_schedules(report_id);

-- ----- report_recipients
CREATE TABLE IF NOT EXISTS report_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  email TEXT,
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_report_recipients_schedule ON report_recipients(schedule_id);

-- ----- report_runs
CREATE TABLE IF NOT EXISTS report_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  schedule_id INTEGER REFERENCES report_schedules(id),
  status TEXT NOT NULL DEFAULT 'running',
  row_count INTEGER,
  output_format TEXT,
  error_message TEXT,
  triggered_by INTEGER REFERENCES users(id),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_report_runs_report ON report_runs(report_id, started_at);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON report_runs(status);

-- ----- email_campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  layout TEXT NOT NULL DEFAULT 'branded',
  body_html TEXT NOT NULL,
  body_text TEXT,
  recipient_type TEXT NOT NULL,
  recipient_meta TEXT,
  status TEXT NOT NULL DEFAULT 'sending',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at);
