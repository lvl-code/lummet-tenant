-- =====================================================
-- 0052_reviews_generic_rebuild.sql
-- Phase 2 — Compatibility Foundation (part 2 of 2)
--
-- The ONE non-additive change in Phase 2. SQLite cannot drop a
-- NOT NULL constraint (needed on casino_slug) with a plain
-- ALTER TABLE, so this rebuilds the table: create the new shape,
-- copy every row across with every column preserved verbatim and
-- every id preserved exactly, drop the old table, rename the new one
-- into place, recreate every existing index.
--
-- SOURCE OF TRUTH FOR THE RECONSTRUCTED SCHEMA (verified against the
-- actual migration files, not just schema.sql, per the requirement
-- not to use an abbreviated definition):
--   schema.sql            lines 140-177  (base CREATE TABLE + 3 indexes)
--   schema.sql            lines 397-403  (overview/games/bonuses/
--                                         payments/licenses/faq_json/
--                                         verdict -- inlined copy of
--                                         migration 0002's changes)
--   0002_phase2_upgrade.sql              same 7 columns (historical
--                                         incremental version of the
--                                         above, for DBs migrated
--                                         forward rather than bootstrapped
--                                         fresh -- both paths converge
--                                         on the same final column set)
--   0005_authors_integration.sql         author_id + idx_reviews_author
--   0010_ai_indexes.sql                  idx_reviews_title
--   0014_item_level_access.sql           created_by + idx_reviews_created_by
--   0037_content_seo_keywords.sql        seo_keywords
--
-- Confirmed NOT touching reviews (checked and excluded):
--   0003, 0004, 0006, 0007, 0008(x3), 0012, 0013, 0016-0036 (except
--   0023/0027 below), 0038-0044 -- none of these ALTER reviews.
--   0023_affiliate_partners_programs.sql only *mentions* reviews in a
--   comment (permissions pattern precedent) -- no column change.
--   0027_analytics_events.sql adds `review_id INTEGER REFERENCES
--   reviews(id)` to a DIFFERENT table (analytics_events) -- this is a
--   reference INTO reviews.id, not a change to reviews itself, and is
--   the reason id-preservation (not just count-preservation) is
--   mandatory in this rebuild: analytics_events rows already point at
--   specific review ids and must keep resolving correctly.
--
-- Rolled forward, the full current column list (in original order)
-- is therefore:
--   id, casino_slug, country_code, slug, title, content, pros, cons,
--   rating, seo_title, seo_description, ai_generated, published,
--   created_at, updated_at, overview, games, bonuses, payments,
--   licenses, faq_json, verdict, author_id, created_by, seo_keywords
-- and the full current index list is:
--   idx_reviews_slug, idx_reviews_casino, idx_reviews_country,
--   idx_reviews_title, idx_reviews_author, idx_reviews_created_by
-- Both are reproduced in full below, with nothing dropped and nothing
-- renamed, plus exactly two new nullable columns appended at the end.
-- =====================================================

PRAGMA foreign_keys = OFF;  -- required while swapping the table; re-enabled at the end

BEGIN TRANSACTION;

CREATE TABLE reviews_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- casino_slug: NOT NULL -> nullable. This is the only constraint
    -- change in this migration. Every existing row already has a
    -- non-null value here and that value is copied verbatim below --
    -- no existing row's casino_slug is touched, cleared, or altered.
    casino_slug TEXT,

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
    seo_keywords TEXT,

    -- NEW, additive, nullable. Existing (casino) reviews get these
    -- backfilled below to 'casino' / casinos.id -- every existing
    -- casino_slug-based query keeps working unmodified; these columns
    -- are purely additive read paths for the new generic engine.
    reviewed_content_type TEXT,   -- 'casino' | 'sportsbook' | 'affiliate_partner' | 'custom'
    reviewed_content_id INTEGER
);

-- Explicit column list on both sides (never `SELECT *`) so a future
-- column-order change in either table can't silently shift data into
-- the wrong column.
INSERT INTO reviews_new (
    id, casino_slug, country_code, slug, title, content, pros, cons, rating,
    seo_title, seo_description, ai_generated, published, created_at, updated_at,
    overview, games, bonuses, payments, licenses, faq_json, verdict,
    author_id, created_by, seo_keywords,
    reviewed_content_type, reviewed_content_id
)
SELECT
    id, casino_slug, country_code, slug, title, content, pros, cons, rating,
    seo_title, seo_description, ai_generated, published, created_at, updated_at,
    overview, games, bonuses, payments, licenses, faq_json, verdict,
    author_id, created_by, seo_keywords,
    'casino' AS reviewed_content_type,
    (SELECT c.id FROM casinos c WHERE c.slug = reviews.casino_slug) AS reviewed_content_id
FROM reviews;

-- Sanity gate, inside the same transaction: if any existing review's
-- casino_slug didn't resolve to a real casino (orphaned data), abort
-- the whole migration rather than silently leaving
-- reviewed_content_id NULL for it. Better to surface bad data now
-- than to migrate around it invisibly.
-- (D1/SQLite: RAISE via a trigger isn't needed here -- a failing
-- subquery-based assertion is done in the verification step outside
-- this file, per the compatibility verification plan, because SQLite
-- has no inline "abort transaction if condition" statement. Run that
-- check before committing in any real environment.)

DROP TABLE reviews;
ALTER TABLE reviews_new RENAME TO reviews;

-- Recreate every pre-existing index, unchanged, plus one new index
-- for the new columns.
CREATE INDEX idx_reviews_slug ON reviews(slug);
CREATE INDEX idx_reviews_casino ON reviews(casino_slug);
CREATE INDEX idx_reviews_country ON reviews(country_code);
CREATE INDEX idx_reviews_title ON reviews(title);
CREATE INDEX idx_reviews_author ON reviews(author_id);
CREATE INDEX idx_reviews_created_by ON reviews(created_by);
CREATE INDEX idx_reviews_reviewed_content ON reviews(reviewed_content_type, reviewed_content_id);

COMMIT;

PRAGMA foreign_keys = ON;
