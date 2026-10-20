-- =====================================================
-- 0004: Pages, reviews and news
-- =====================================================
-- Authors, CMS pages, casino reviews, news articles, review blocks, SEO meta,
-- banners, navigation, SEO landing pages and platform updates.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- authors
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'editor',
  email TEXT,
  social_links TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  job_title TEXT,
  expertise TEXT,
  location TEXT,
  website_url TEXT
);

-- ----- pages
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  template TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT,
  seo_title TEXT,
  seo_description TEXT,
  ai_generated INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  author_id INTEGER REFERENCES authors(id),
  created_by INTEGER,
  seo_keywords TEXT
);
CREATE INDEX IF NOT EXISTS idx_pages_author ON pages(author_id);
CREATE INDEX IF NOT EXISTS idx_pages_created_by ON pages(created_by);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);

-- ----- reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  casino_slug TEXT NOT NULL,
  country_code TEXT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pros TEXT,
  cons TEXT,
  rating REAL,
  seo_title TEXT,
  seo_description TEXT,
  ai_generated INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  overview TEXT,
  games TEXT,
  bonuses TEXT,
  payments TEXT,
  licenses TEXT,
  faq_json TEXT,
  verdict TEXT,
  author TEXT DEFAULT 'Elie Bizimana',
  author_title TEXT,
  reviewed_at TEXT,
  author_id INTEGER REFERENCES authors(id),
  created_by INTEGER,
  seo_keywords TEXT,
  reviewed_content_type TEXT,
  reviewed_content_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reviews_author ON reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_casino ON reviews(casino_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_country ON reviews(country_code);
CREATE INDEX IF NOT EXISTS idx_reviews_created_by ON reviews(created_by);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(published);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_content ON reviews(reviewed_content_type, reviewed_content_id);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_title ON reviews(title);

-- ----- review_blocks
CREATE TABLE IF NOT EXISTS review_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rb_slug ON review_blocks(review_slug);

-- ----- seo_meta
CREATE TABLE IF NOT EXISTS seo_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type TEXT NOT NULL,
  page_slug TEXT NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT,
  canonical TEXT,
  og_image TEXT,
  schema_json TEXT,
  robots TEXT DEFAULT 'index, follow',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_type, page_slug)
);
CREATE INDEX IF NOT EXISTS idx_seo_page ON seo_meta(page_type, page_slug);

-- ----- news
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  ai_generated INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  featured_image INTEGER,
  excerpt TEXT,
  tags TEXT,
  author_id INTEGER REFERENCES authors(id),
  published_at DATETIME,
  created_by INTEGER,
  ad_mode TEXT DEFAULT 'auto',
  ad_override_rules TEXT,
  seo_keywords TEXT,
  og_image INTEGER REFERENCES media_library(id),
  article_type TEXT,
  section_id INTEGER REFERENCES news_sections(id),
  primary_country TEXT,
  region_slug TEXT,
  content_class TEXT,
  labels TEXT,
  methodology TEXT,
  pr_provided_by TEXT,
  pr_original_source_url TEXT,
  pr_original_date TEXT,
  disclosure_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_news_article_type ON news(article_type);
CREATE INDEX IF NOT EXISTS idx_news_author ON news(author_id);
CREATE INDEX IF NOT EXISTS idx_news_created_by ON news(created_by);
CREATE INDEX IF NOT EXISTS idx_news_date ON news(created_at);
CREATE INDEX IF NOT EXISTS idx_news_primary_country ON news(primary_country);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
CREATE INDEX IF NOT EXISTS idx_news_published_date ON news(published, published_at);
CREATE INDEX IF NOT EXISTS idx_news_section ON news(section_id);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);

-- ----- banners
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT DEFAULT 'announcement',
  title TEXT,
  content TEXT,
  link TEXT,
  button_text TEXT,
  bg_color TEXT DEFAULT '#6c5ce7',
  text_color TEXT DEFAULT '#ffffff',
  position TEXT DEFAULT 'top',
  dismissible INTEGER DEFAULT 1,
  geo_countries TEXT,
  start_date TEXT,
  end_date TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_banners_enabled ON banners(enabled, position);

-- ----- nav_items
CREATE TABLE IF NOT EXISTS nav_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  parent_id INTEGER,
  position INTEGER DEFAULT 0,
  location TEXT DEFAULT 'header',
  is_external INTEGER DEFAULT 0,
  icon TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  auto_generated INTEGER DEFAULT 0,
  source_type TEXT,
  source_ref TEXT,
  scope_type TEXT,
  scope_ref TEXT
);
CREATE INDEX IF NOT EXISTS idx_nav_items_scope ON nav_items(location, scope_type, scope_ref, enabled, position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nav_items_source ON nav_items(source_type, source_ref) WHERE source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nav_location ON nav_items(location, enabled, position);

-- ----- page_nav_geo_rules
CREATE TABLE IF NOT EXISTS page_nav_geo_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nav_item_id INTEGER NOT NULL,
  country_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'allowed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nav_item_id) REFERENCES nav_items(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_page_nav_geo_country ON page_nav_geo_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_page_nav_geo_item ON page_nav_geo_rules(nav_item_id);
CREATE INDEX IF NOT EXISTS idx_page_nav_geo_lookup ON page_nav_geo_rules(nav_item_id, country_code);

-- ----- seo_pages
CREATE TABLE IF NOT EXISTS seo_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type TEXT NOT NULL CHECK (page_type IN ('country_custom', 'category_country')),
  slug TEXT NOT NULL,
  country_code TEXT NOT NULL REFERENCES countries(code),
  category_id INTEGER REFERENCES categories(id),
  title TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  og_image TEXT,
  featured_image TEXT,
  canonical_url TEXT,
  robots TEXT DEFAULT 'index,follow',
  author_id INTEGER REFERENCES authors(id),
  content_json TEXT,
  casino_mode TEXT NOT NULL DEFAULT 'auto_priority' CHECK (casino_mode IN ('manual', 'auto', 'auto_priority')),
  min_casino_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published')),
  published INTEGER NOT NULL DEFAULT 0,
  sitemap_enabled INTEGER NOT NULL DEFAULT 1,
  auto_generated INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  updated_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  nav_label TEXT,
  seo_keywords TEXT,
  UNIQUE (page_type, country_code, slug)
);
CREATE INDEX IF NOT EXISTS idx_seo_pages_category_country ON seo_pages(category_id, country_code);
CREATE INDEX IF NOT EXISTS idx_seo_pages_lookup ON seo_pages(page_type, country_code, slug);
CREATE INDEX IF NOT EXISTS idx_seo_pages_status ON seo_pages(published, sitemap_enabled);

-- ----- seo_page_casinos
CREATE TABLE IF NOT EXISTS seo_page_casinos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seo_page_id INTEGER NOT NULL REFERENCES seo_pages(id) ON DELETE CASCADE,
  casino_id INTEGER NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  section_key TEXT,
  display_mode TEXT NOT NULL DEFAULT 'card' CHECK (display_mode IN ('card', 'editorial', 'comparison')),
  custom_label TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  editorial_content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (seo_page_id, casino_id, section_key)
);
CREATE INDEX IF NOT EXISTS idx_seo_page_casinos_page ON seo_page_casinos(seo_page_id, position);

-- ----- platform_updates
CREATE TABLE IF NOT EXISTS platform_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image INTEGER,
  seo_title TEXT,
  seo_description TEXT,
  author_id INTEGER,
  published INTEGER DEFAULT 1,
  featured INTEGER DEFAULT 0,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  seo_keywords TEXT,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_platform_updates_author ON platform_updates(author_id);
CREATE INDEX IF NOT EXISTS idx_platform_updates_created_by ON platform_updates(created_by);
CREATE INDEX IF NOT EXISTS idx_platform_updates_date ON platform_updates(published_at);
CREATE INDEX IF NOT EXISTS idx_platform_updates_featured ON platform_updates(featured);
CREATE INDEX IF NOT EXISTS idx_platform_updates_published ON platform_updates(published);
CREATE INDEX IF NOT EXISTS idx_platform_updates_slug ON platform_updates(slug);
