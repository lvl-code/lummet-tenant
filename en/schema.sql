-- 1. Core Casino Directory Table
CREATE TABLE IF NOT EXISTS casinos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    logo TEXT,
    rating REAL DEFAULT 5.0,
    bonus_title TEXT,
    bonus_value REAL DEFAULT 0.0,
    features TEXT, -- JSON Array formatted string
    supported_countries TEXT, -- JSON Array formatted string
    restricted_countries TEXT, -- JSON Array formatted string
    license TEXT,
    owner TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Localized Review Text Engine
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    casino_slug TEXT NOT NULL,
    country TEXT NOT NULL, -- Target ISO-2 identifier (e.g., RW, CA, DE)
    title TEXT,
    content TEXT, -- Long-form specialized copy or AI text payloads
    pros TEXT, -- JSON Array formatted string
    cons TEXT, -- JSON Array formatted string
    rating REAL,
    seo_title TEXT,
    seo_description TEXT,
    created_by_ai INTEGER DEFAULT 0, -- 0 = Manual, 1 = Edge AI
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(casino_slug, country),
    FOREIGN KEY(casino_slug) REFERENCES casinos(slug) ON DELETE CASCADE
);

-- 3. Jurisdiction Compliance Metrics
CREATE TABLE IF NOT EXISTS countries (
    code TEXT PRIMARY KEY, -- ISO-2 country keys (e.g., RW)
    name TEXT NOT NULL,
    currency TEXT,
    language TEXT DEFAULT 'en',
    legal_status TEXT, -- Allowed, Blocked, Regulated
    recommended_casinos TEXT, -- JSON Array ordered ranking map
    seo_text TEXT
);

-- 4. Category Classification Matrix
CREATE TABLE IF NOT EXISTS categories (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    seo_title TEXT,
    seo_description TEXT
);

-- 5. Real-Time News Stream
CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    author TEXT DEFAULT 'Staff Editor',
    ai_generated INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Identity Access Management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'editor', -- admin, editor, viewer
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. High-Precision Geo Override Overlord
CREATE TABLE IF NOT EXISTS geo_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    casino_slug TEXT NOT NULL,
    country TEXT NOT NULL,
    status TEXT DEFAULT 'allowed', -- allowed, blocked, restricted
    bonus_override TEXT, -- Custom target offer string for specific markets
    notes TEXT,
    UNIQUE(casino_slug, country),
    FOREIGN KEY(casino_slug) REFERENCES casinos(slug) ON DELETE CASCADE
);

-- 8. Dynamic Page Infrastructure (The Ultimate Routing Component)
CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE, -- E.g., 'affiliate/become'
    type TEXT NOT NULL, -- affiliate, landing, category, static
    template TEXT NOT NULL, -- Target HTML layout template pointer
    title TEXT NOT NULL,
    seo_title TEXT,
    seo_description TEXT,
    content_json TEXT, -- Highly structured blocks data model payload
    ai_generated INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create structural tracking indexes for high-speed lookups
CREATE INDEX IF NOT EXISTS idx_casinos_slug ON casinos(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_lookup ON reviews(casino_slug, country);
CREATE INDEX IF NOT EXISTS idx_geo_rules_lookup ON geo_rules(casino_slug, country);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
