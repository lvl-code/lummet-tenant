-- =====================================================
-- LEVELCASINO CMS
-- Cloudflare D1 Schema v1
-- =====================================================

PRAGMA foreign_keys = ON;

-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'editor',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email
ON users(email);

-- =====================================================
-- SESSIONS
-- =====================================================

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,

    user_id INTEGER NOT NULL,

    expires_at DATETIME NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user
ON sessions(user_id);

-- =====================================================
-- COUNTRIES
-- =====================================================

CREATE TABLE countries (
    code TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    currency TEXT,
    language TEXT,

    legal_status TEXT,

    seo_title TEXT,
    seo_description TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CASINOS
-- =====================================================

CREATE TABLE casinos (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_casinos_slug
ON casinos(slug);

CREATE INDEX idx_casinos_published
ON casinos(published);

-- =====================================================
-- GEO RULES
-- =====================================================

CREATE TABLE geo_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    casino_slug TEXT NOT NULL,

    country_code TEXT NOT NULL,

    status TEXT NOT NULL,

    bonus_override TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_geo_casino
ON geo_rules(casino_slug);

CREATE INDEX idx_geo_country
ON geo_rules(country_code);

-- =====================================================
-- REVIEWS
-- =====================================================

CREATE TABLE reviews (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_slug
ON reviews(slug);

CREATE INDEX idx_reviews_casino
ON reviews(casino_slug);

CREATE INDEX idx_reviews_country
ON reviews(country_code);

-- =====================================================
-- NEWS
-- =====================================================

CREATE TABLE news (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_slug
ON news(slug);

-- =====================================================
-- CATEGORIES
-- =====================================================

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    slug TEXT UNIQUE NOT NULL,

    name TEXT NOT NULL,

    description TEXT,

    seo_title TEXT,
    seo_description TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug
ON categories(slug);

-- =====================================================
-- DYNAMIC PAGES
-- =====================================================

CREATE TABLE pages (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pages_slug
ON pages(slug);

CREATE INDEX idx_pages_type
ON pages(type);

-- =====================================================
-- CLICK TRACKING
-- Keep because affiliate sites need it
-- =====================================================

CREATE TABLE clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    casino_slug TEXT NOT NULL,

    country_code TEXT,

    city TEXT,

    ip_hash TEXT,

    user_agent TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clicks_casino
ON clicks(casino_slug);

CREATE INDEX idx_clicks_date
ON clicks(created_at);

-- =====================================================
-- AI GENERATION HISTORY
-- Useful for dashboard auditing
-- =====================================================

CREATE TABLE ai_generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    entity_type TEXT NOT NULL,

    entity_slug TEXT NOT NULL,

    prompt TEXT,

    model TEXT,

    status TEXT DEFAULT 'completed',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_entity
ON ai_generations(entity_slug);

-- =====================================================
-- SETTINGS
-- Global CMS settings
-- =====================================================

CREATE TABLE settings (
    key TEXT PRIMARY KEY,

    value TEXT,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
