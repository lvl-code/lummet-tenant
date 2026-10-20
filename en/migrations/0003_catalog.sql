-- =====================================================
-- 0003: Casino catalogue
-- =====================================================
-- Countries, categories, casinos and their joins, geo rules, FAQs, payment
-- methods and player-submitted casinos.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- countries
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT,
  language TEXT,
  legal_status TEXT,
  seo_title TEXT,
  seo_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  content_json TEXT,
  robots TEXT DEFAULT 'index,follow',
  status TEXT DEFAULT 'published',
  published INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  featured_position INTEGER DEFAULT 0,
  tier INTEGER DEFAULT 3,
  seo_keywords TEXT,
  og_image INTEGER REFERENCES media_library(id)
);
CREATE INDEX IF NOT EXISTS idx_countries_featured ON countries(is_featured, featured_position);
CREATE INDEX IF NOT EXISTS idx_countries_published ON countries(published);

-- ----- categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  content_json TEXT,
  robots TEXT DEFAULT 'index,follow',
  status TEXT DEFAULT 'published',
  published INTEGER DEFAULT 1,
  seo_keywords TEXT,
  og_image INTEGER REFERENCES media_library(id)
);
CREATE INDEX IF NOT EXISTS idx_categories_published ON categories(published);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ----- casinos
CREATE TABLE IF NOT EXISTS casinos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo TEXT,
  website_url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  rating REAL DEFAULT 0,
  bonus_title TEXT,
  bonus_value TEXT,
  license TEXT,
  owner TEXT,
  features TEXT,
  supported_countries TEXT,
  restricted_countries TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  logo_media_id INTEGER,
  hero_image_media_id INTEGER,
  created_by INTEGER,
  seo_keywords TEXT
);
CREATE INDEX IF NOT EXISTS idx_casino_name ON casinos(name);
CREATE INDEX IF NOT EXISTS idx_casinos_created_by ON casinos(created_by);
CREATE INDEX IF NOT EXISTS idx_casinos_featured ON casinos(featured);
CREATE INDEX IF NOT EXISTS idx_casinos_published ON casinos(published);
CREATE INDEX IF NOT EXISTS idx_casinos_slug ON casinos(slug);
CREATE INDEX IF NOT EXISTS idx_casinos_sort_order ON casinos(sort_order);

-- ----- casino_categories
CREATE TABLE IF NOT EXISTS casino_categories (
  casino_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (casino_id, category_id),
  FOREIGN KEY (casino_id) REFERENCES casinos(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cc_casino ON casino_categories(casino_id);
CREATE INDEX IF NOT EXISTS idx_cc_category ON casino_categories(category_id);

-- ----- geo_rules
CREATE TABLE IF NOT EXISTS geo_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  casino_slug TEXT NOT NULL,
  country_code TEXT NOT NULL,
  status TEXT NOT NULL,
  bonus_override TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  priority INTEGER DEFAULT 0,
  redirect_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_geo_casino ON geo_rules(casino_slug);
CREATE INDEX IF NOT EXISTS idx_geo_country ON geo_rules(country_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_unique ON geo_rules(casino_slug, country_code);

-- ----- faqs
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----- payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  method_type TEXT DEFAULT 'card',
  description TEXT,
  content_json TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  published INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_published ON payment_methods(published);
CREATE INDEX IF NOT EXISTS idx_payment_methods_slug ON payment_methods(slug);

-- ----- casino_payment_methods
CREATE TABLE IF NOT EXISTS casino_payment_methods (
  casino_id INTEGER NOT NULL,
  payment_method_id INTEGER NOT NULL,
  PRIMARY KEY (casino_id, payment_method_id),
  FOREIGN KEY (casino_id) REFERENCES casinos(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cpm_casino ON casino_payment_methods(casino_id);
CREATE INDEX IF NOT EXISTS idx_cpm_payment_method ON casino_payment_methods(payment_method_id);

-- ----- casino_submissions
CREATE TABLE IF NOT EXISTS casino_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  affiliate_url TEXT,
  bonus_value TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON casino_submissions(user_id, status);
