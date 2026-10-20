-- =====================================================
-- 0005: Components and ad rules
-- =====================================================
-- Reusable components, their placement on pages, and the rules that inject
-- them into content.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- components
CREATE TABLE IF NOT EXISTS components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  settings_json TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_components_slug ON components(slug);
CREATE INDEX IF NOT EXISTS idx_components_status ON components(status);
CREATE INDEX IF NOT EXISTS idx_components_type ON components(type);

-- ----- page_components
CREATE TABLE IF NOT EXISTS page_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type TEXT NOT NULL,
  page_slug TEXT NOT NULL,
  component_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  injection_point TEXT DEFAULT 'content_bottom',
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pc_bulk ON page_components(page_type, page_slug, injection_point, enabled);
CREATE INDEX IF NOT EXISTS idx_pc_component ON page_components(component_id);
CREATE INDEX IF NOT EXISTS idx_pc_page ON page_components(page_type, page_slug);

-- ----- ad_rules
CREATE TABLE IF NOT EXISTS ad_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  placement TEXT NOT NULL DEFAULT 'after_paragraph',
  position_value INTEGER DEFAULT 3,
  repeat_interval INTEGER DEFAULT 0,
  max_appearances INTEGER DEFAULT 1,
  devices TEXT DEFAULT 'all',
  countries TEXT DEFAULT 'all',
  page_type TEXT DEFAULT 'all',
  priority INTEGER DEFAULT 100,
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ad_rules_enabled ON ad_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_ad_rules_page_type ON ad_rules(page_type);
CREATE INDEX IF NOT EXISTS idx_ad_rules_priority ON ad_rules(priority);
