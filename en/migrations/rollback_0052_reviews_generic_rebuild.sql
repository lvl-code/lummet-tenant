-- =====================================================
-- ROLLBACK for 0052_reviews_generic_rebuild.sql
--
-- SAFE TO RUN ONLY IF every review row still has a non-null
-- casino_slug -- i.e. no sportsbook/affiliate_partner/custom review
-- has been created yet (those would have reviewed_content_type set
-- and casino_slug NULL, which cannot be restored to NOT NULL without
-- losing those rows). Run this check first and STOP if it returns
-- anything other than 0:
--
--   SELECT COUNT(*) FROM reviews WHERE casino_slug IS NULL;
--
-- If that returns 0, this rollback is a clean, data-preserving
-- inverse of 0052: same rebuild technique, same id preservation, same
-- full index recreation, just without the two generic columns and
-- with casino_slug's NOT NULL constraint restored.
-- =====================================================

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

CREATE TABLE reviews_rollback (
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
    author_id INTEGER REFERENCES authors(id),
    created_by INTEGER,
    seo_keywords TEXT
);

INSERT INTO reviews_rollback (
    id, casino_slug, country_code, slug, title, content, pros, cons, rating,
    seo_title, seo_description, ai_generated, published, created_at, updated_at,
    overview, games, bonuses, payments, licenses, faq_json, verdict,
    author_id, created_by, seo_keywords
)
SELECT
    id, casino_slug, country_code, slug, title, content, pros, cons, rating,
    seo_title, seo_description, ai_generated, published, created_at, updated_at,
    overview, games, bonuses, payments, licenses, faq_json, verdict,
    author_id, created_by, seo_keywords
FROM reviews;

DROP TABLE reviews;
ALTER TABLE reviews_rollback RENAME TO reviews;

CREATE INDEX idx_reviews_slug ON reviews(slug);
CREATE INDEX idx_reviews_casino ON reviews(casino_slug);
CREATE INDEX idx_reviews_country ON reviews(country_code);
CREATE INDEX idx_reviews_title ON reviews(title);
CREATE INDEX idx_reviews_author ON reviews(author_id);
CREATE INDEX idx_reviews_created_by ON reviews(created_by);

COMMIT;

PRAGMA foreign_keys = ON;
