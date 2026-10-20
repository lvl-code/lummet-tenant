-- =====================================================
-- 0012: Content landing pages
-- =====================================================
-- SEO landing pages for generic content types and the items they list.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- content_landing_pages
CREATE TABLE IF NOT EXISTS content_landing_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL CHECK (content_type IN ('sportsbook', 'affiliate_partner', 'custom')),
  custom_type_slug TEXT REFERENCES custom_content_types(slug),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  item_mode TEXT NOT NULL DEFAULT 'manual' CHECK (item_mode IN ('manual', 'auto')),
  auto_limit INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  author_id INTEGER REFERENCES authors(id),
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_content_landing_pages_type ON content_landing_pages(content_type);

-- ----- content_landing_page_items
CREATE TABLE IF NOT EXISTS content_landing_page_items (
  landing_page_id INTEGER NOT NULL REFERENCES content_landing_pages(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (landing_page_id, content_id)
);
