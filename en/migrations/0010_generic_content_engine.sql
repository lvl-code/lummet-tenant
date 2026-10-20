-- =====================================================
-- 0010: Generic content engine
-- =====================================================
-- Content items and custom content types with their fields, taxonomy joins,
-- comparisons and review criteria.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- custom_content_types
CREATE TABLE IF NOT EXISTS custom_content_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  icon TEXT,
  review_enabled INTEGER DEFAULT 1,
  comparison_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----- custom_field_definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  custom_type_slug TEXT NOT NULL REFERENCES custom_content_types(slug) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text','textarea','number','boolean','url','date','select','multi_select','country','currency','image','rating')),
  options_json TEXT,
  required INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  UNIQUE(custom_type_slug, field_key)
);
CREATE INDEX IF NOT EXISTS idx_custom_field_defs_type ON custom_field_definitions(custom_type_slug);

-- ----- content_items
CREATE TABLE IF NOT EXISTS content_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL CHECK (content_type IN ('sportsbook', 'affiliate_partner', 'custom')),
  custom_type_slug TEXT REFERENCES custom_content_types(slug),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  excerpt TEXT,
  logo_media_id INTEGER REFERENCES media_library(id),
  featured_image_media_id INTEGER REFERENCES media_library(id),
  website TEXT,
  rating REAL DEFAULT 0,
  license TEXT,
  license_country TEXT,
  live_betting INTEGER DEFAULT 0,
  pre_match INTEGER DEFAULT 0,
  cashout INTEGER DEFAULT 0,
  mobile_app INTEGER DEFAULT 0,
  linked_affiliate_partner_id INTEGER REFERENCES affiliate_partners(id),
  metadata_json TEXT,
  featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  published INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  author_id INTEGER REFERENCES authors(id),
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  tracking_url TEXT,
  UNIQUE(content_type, slug)
);
CREATE INDEX IF NOT EXISTS idx_content_items_affiliate_partner ON content_items(linked_affiliate_partner_id);
CREATE INDEX IF NOT EXISTS idx_content_items_author ON content_items(author_id);
CREATE INDEX IF NOT EXISTS idx_content_items_created_by ON content_items(created_by);
CREATE INDEX IF NOT EXISTS idx_content_items_slug ON content_items(content_type, slug);
CREATE INDEX IF NOT EXISTS idx_content_items_type_status ON content_items(content_type, status);

-- ----- custom_field_values
CREATE TABLE IF NOT EXISTS custom_field_values (
  content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (content_item_id, field_key)
);

-- ----- content_categories
CREATE TABLE IF NOT EXISTS content_categories (
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (content_type, content_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_content_categories_cat ON content_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_lookup ON content_categories(content_type, content_id);

-- ----- content_geo
CREATE TABLE IF NOT EXISTS content_geo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  country_code TEXT NOT NULL REFERENCES countries(code),
  status TEXT NOT NULL,
  bonus_override TEXT,
  priority INTEGER DEFAULT 0,
  redirect_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_geo_country ON content_geo(country_code);
CREATE INDEX IF NOT EXISTS idx_content_geo_lookup ON content_geo(content_type, content_id);

-- ----- sports
CREATE TABLE IF NOT EXISTS sports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ----- content_sports
CREATE TABLE IF NOT EXISTS content_sports (
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  sport_id INTEGER NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  PRIMARY KEY (content_type, content_id, sport_id)
);
CREATE INDEX IF NOT EXISTS idx_content_sports_sport ON content_sports(sport_id);

-- ----- currencies
CREATE TABLE IF NOT EXISTS currencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_crypto INTEGER DEFAULT 0
);

-- ----- content_currencies
CREATE TABLE IF NOT EXISTS content_currencies (
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  currency_id INTEGER NOT NULL REFERENCES currencies(id) ON DELETE CASCADE,
  PRIMARY KEY (content_type, content_id, currency_id)
);
CREATE INDEX IF NOT EXISTS idx_content_currencies_currency ON content_currencies(currency_id);

-- ----- content_payment_methods
CREATE TABLE IF NOT EXISTS content_payment_methods (
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  PRIMARY KEY (content_type, content_id, payment_method_id)
);
CREATE INDEX IF NOT EXISTS idx_content_payment_methods_pm ON content_payment_methods(payment_method_id);

-- ----- comparisons
CREATE TABLE IF NOT EXISTS comparisons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  criteria_json TEXT,
  editorial_selection_item_type TEXT,
  editorial_selection_item_id INTEGER,
  status TEXT DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  author_id INTEGER REFERENCES authors(id),
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  UNIQUE(content_type, slug)
);
CREATE INDEX IF NOT EXISTS idx_comparisons_type_status ON comparisons(content_type, status);

-- ----- comparison_items
CREATE TABLE IF NOT EXISTS comparison_items (
  comparison_id INTEGER NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  item_content_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (comparison_id, item_content_type, item_id)
);

-- ----- review_criteria_templates
CREATE TABLE IF NOT EXISTS review_criteria_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,
  criterion_key TEXT NOT NULL,
  label TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  UNIQUE(content_type, criterion_key)
);

-- ----- review_criteria_scores
CREATE TABLE IF NOT EXISTS review_criteria_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  criterion_key TEXT NOT NULL,
  score REAL NOT NULL,
  UNIQUE(review_id, criterion_key)
);
