-- =====================================================
-- 0001: Identity, access control and site settings
-- =====================================================
-- Users and sessions, login attempts, password resets, the role/permission
-- matrix, item-level access, site settings, audit log, newsletter and the
-- visitor account tables (bookmarks, inquiries, notifications).
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ----- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ----- auth_attempts
CREATE TABLE IF NOT EXISTS auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts(ip_hash, action, created_at);

-- ----- password_resets
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- ----- permissions
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed INTEGER DEFAULT 0,
  UNIQUE(role, resource, action)
);

-- ----- user_item_access
CREATE TABLE IF NOT EXISTS user_item_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'read',
  scope TEXT NOT NULL DEFAULT 'all',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, resource, action),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_item_access_resource ON user_item_access(resource);
CREATE INDEX IF NOT EXISTS idx_user_item_access_user ON user_item_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_item_access_user_resource ON user_item_access(user_id, resource);

-- ----- item_access_assignments
CREATE TABLE IF NOT EXISTS item_access_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  UNIQUE(user_id, resource, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_item_assignments_item ON item_access_assignments(resource, item_id);
CREATE INDEX IF NOT EXISTS idx_item_assignments_resource ON item_access_assignments(resource);
CREATE INDEX IF NOT EXISTS idx_item_assignments_user ON item_access_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_item_assignments_user_resource ON item_access_assignments(user_id, resource);

-- ----- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ----- settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

-- ----- newsletter_subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT UNIQUE NOT NULL,
  subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  unsubscribed_at DATETIME,
  user_id INTEGER REFERENCES users(id),
  notify_news INTEGER NOT NULL DEFAULT 1,
  notify_casinos INTEGER NOT NULL DEFAULT 1,
  notify_reviews INTEGER NOT NULL DEFAULT 1,
  notify_weekly_report INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'footer'
);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_token ON newsletter_subscribers(token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user ON newsletter_subscribers(user_id);

-- ----- user_bookmarks
CREATE TABLE IF NOT EXISTS user_bookmarks (
  user_id INTEGER NOT NULL,
  casino_slug TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, casino_slug)
);

-- ----- user_inquiries
CREATE TABLE IF NOT EXISTS user_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_reply TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inquiries_user ON user_inquiries(user_id, status);

-- ----- user_notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  severity TEXT DEFAULT 'info',
  category TEXT,
  related_resource TEXT,
  related_id INTEGER,
  expires_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON user_notifications(category, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id, is_read);
