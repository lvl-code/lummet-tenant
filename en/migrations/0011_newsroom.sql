-- =====================================================
-- 0011: Newsroom
-- =====================================================
-- Sections, topics, regions, entities and series; article joins; sources,
-- corrections, timeline, revisions and editorial workflow; redirects and
-- search.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- news_sections
CREATE TABLE IF NOT EXISTS news_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  og_image INTEGER REFERENCES media_library(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  parent_id INTEGER REFERENCES news_sections(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_sections_active_order ON news_sections(active, display_order);
CREATE INDEX IF NOT EXISTS idx_news_sections_parent ON news_sections(parent_id);

-- ----- news_topics
CREATE TABLE IF NOT EXISTS news_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----- news_regions
CREATE TABLE IF NOT EXISTS news_regions (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

-- ----- news_region_countries
CREATE TABLE IF NOT EXISTS news_region_countries (
  region_slug TEXT NOT NULL REFERENCES news_regions(slug) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  PRIMARY KEY (region_slug, country_code)
);
CREATE INDEX IF NOT EXISTS idx_news_region_countries_country ON news_region_countries(country_code);

-- ----- news_entities
CREATE TABLE IF NOT EXISTS news_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'company',
  description TEXT,
  logo_media_id INTEGER REFERENCES media_library(id),
  website_url TEXT,
  country_code TEXT,
  casino_id INTEGER REFERENCES casinos(id),
  seo_title TEXT,
  seo_description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_entities_country ON news_entities(country_code);
CREATE INDEX IF NOT EXISTS idx_news_entities_type ON news_entities(entity_type, active);

-- ----- news_series
CREATE TABLE IF NOT EXISTS news_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  image_media_id INTEGER REFERENCES media_library(id),
  seo_title TEXT,
  seo_description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----- news_article_topics
CREATE TABLE IF NOT EXISTS news_article_topics (
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES news_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (news_id, topic_id)
);
CREATE INDEX IF NOT EXISTS idx_news_article_topics_topic ON news_article_topics(topic_id, news_id);

-- ----- news_article_countries
CREATE TABLE IF NOT EXISTS news_article_countries (
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (news_id, country_code)
);
CREATE INDEX IF NOT EXISTS idx_news_article_countries_country ON news_article_countries(country_code, news_id);

-- ----- news_article_entities
CREATE TABLE IF NOT EXISTS news_article_entities (
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  entity_id INTEGER NOT NULL REFERENCES news_entities(id) ON DELETE CASCADE,
  role TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (news_id, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_news_article_entities_entity ON news_article_entities(entity_id, news_id);

-- ----- news_series_articles
CREATE TABLE IF NOT EXISTS news_series_articles (
  series_id INTEGER NOT NULL REFERENCES news_series(id) ON DELETE CASCADE,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (series_id, news_id)
);
CREATE INDEX IF NOT EXISTS idx_news_series_articles_news ON news_series_articles(news_id);

-- ----- news_related
CREATE TABLE IF NOT EXISTS news_related (
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  related_news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related',
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (news_id, related_news_id, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_news_related_target ON news_related(related_news_id);

-- ----- news_article_sources
CREATE TABLE IF NOT EXISTS news_article_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'other',
  source_date TEXT,
  author TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_article_sources_news ON news_article_sources(news_id, display_order);

-- ----- news_corrections
CREATE TABLE IF NOT EXISTS news_corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  public_message TEXT NOT NULL,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_corrections_news ON news_corrections(news_id, created_at);

-- ----- news_timeline_updates
CREATE TABLE IF NOT EXISTS news_timeline_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  body TEXT NOT NULL,
  editor_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_timeline_updates_news ON news_timeline_updates(news_id, update_time);

-- ----- news_revisions
CREATE TABLE IF NOT EXISTS news_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL,
  changed_by INTEGER,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  change_summary TEXT,
  changed_fields TEXT,
  previous_values TEXT,
  new_values TEXT,
  UNIQUE (news_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_news_revisions_news ON news_revisions(news_id, version_number DESC);

-- ----- news_editorial
CREATE TABLE IF NOT EXISTS news_editorial (
  news_id INTEGER PRIMARY KEY REFERENCES news(id) ON DELETE CASCADE,
  workflow_status TEXT,
  assigned_to INTEGER,
  reviewed_by INTEGER,
  fact_check_status TEXT,
  fact_checked_by INTEGER,
  fact_checked_at DATETIME,
  approved_by INTEGER,
  published_by INTEGER,
  editor_notes TEXT,
  assignment_notes TEXT,
  fact_check_notes TEXT,
  revision_number INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_editorial_assignee ON news_editorial(assigned_to, workflow_status);
CREATE INDEX IF NOT EXISTS idx_news_editorial_status ON news_editorial(workflow_status);

-- ----- news_editorial_notes
CREATE TABLE IF NOT EXISTS news_editorial_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL DEFAULT 'editor',
  body TEXT NOT NULL,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_editorial_notes_news ON news_editorial_notes(news_id, created_at);

-- ----- news_pins
CREATE TABLE IF NOT EXISTS news_pins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  starts_at DATETIME,
  ends_at DATETIME,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_pins_slot ON news_pins(slot, position);

-- ----- news_redirects
CREATE TABLE IF NOT EXISTS news_redirects (
  old_slug TEXT PRIMARY KEY,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_redirects_news ON news_redirects(news_id);

-- ----- news_search_terms
CREATE TABLE IF NOT EXISTS news_search_terms (
  term TEXT NOT NULL,
  news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL,
  PRIMARY KEY (term, news_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_news_search_terms_news ON news_search_terms(news_id);

-- ----- news_search_docs
CREATE TABLE IF NOT EXISTS news_search_docs (
  news_id INTEGER PRIMARY KEY REFERENCES news(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
