-- =====================================================
-- 0009: Research engine
-- =====================================================
-- Research items, sources, claims, relations, versions and datasets.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- research_items
CREATE TABLE IF NOT EXISTS research_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ( 'report', 'country', 'regulator', 'topic', 'development', 'legislation', 'licence')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  content_json TEXT,
  country_id TEXT REFERENCES countries(code),
  author_id INTEGER REFERENCES authors(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ( 'draft', 'researching', 'source_review', 'fact_check', 'editorial_review', 'approved', 'published', 'needs_update', 'archived')),
  published INTEGER NOT NULL DEFAULT 0,
  robots TEXT DEFAULT 'index,follow',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  canonical_url TEXT,
  og_image INTEGER REFERENCES media_library(id),
  featured INTEGER NOT NULL DEFAULT 0,
  published_at DATETIME,
  last_verified_at DATETIME,
  next_review_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (type, slug)
);
CREATE INDEX IF NOT EXISTS idx_research_items_country ON research_items(country_id);
CREATE INDEX IF NOT EXISTS idx_research_items_next_review ON research_items(next_review_at);
CREATE INDEX IF NOT EXISTS idx_research_items_published ON research_items(published);
CREATE INDEX IF NOT EXISTS idx_research_items_status ON research_items(status);
CREATE INDEX IF NOT EXISTS idx_research_items_type ON research_items(type);

-- ----- research_sources
CREATE TABLE IF NOT EXISTS research_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation TEXT NOT NULL,
  title TEXT,
  url TEXT,
  domain TEXT,
  source_type TEXT NOT NULL DEFAULT 'other' CHECK (source_type IN ( 'regulator', 'government', 'legislation', 'court', 'eu_institution', 'official_register', 'operator', 'industry_organization', 'academic', 'research_organization', 'news', 'other')),
  country_id TEXT REFERENCES countries(code),
  is_primary INTEGER NOT NULL DEFAULT 0,
  document_type TEXT,
  language TEXT,
  publication_date DATE,
  accessed_at DATETIME,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'broken', 'archived')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_research_sources_country ON research_sources(country_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_status ON research_sources(status);
CREATE INDEX IF NOT EXISTS idx_research_sources_type ON research_sources(source_type);

-- ----- research_claims
CREATE TABLE IF NOT EXISTS research_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  research_item_id INTEGER NOT NULL REFERENCES research_items(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  claim_type TEXT DEFAULT 'fact',
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ( 'unverified', 'verified', 'disputed', 'superseded')),
  jurisdiction_id TEXT REFERENCES countries(code),
  valid_from DATE,
  valid_until DATE,
  verified_at DATETIME,
  verified_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_research_claims_item ON research_claims(research_item_id);
CREATE INDEX IF NOT EXISTS idx_research_claims_jurisdiction ON research_claims(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_research_claims_status ON research_claims(status);

-- ----- research_claim_sources
CREATE TABLE IF NOT EXISTS research_claim_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL REFERENCES research_claims(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
  citation_context TEXT,
  source_quote TEXT,
  support_type TEXT NOT NULL DEFAULT 'direct' CHECK (support_type IN ( 'direct', 'partial', 'contextual', 'disputed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (claim_id, source_id)
);
CREATE INDEX IF NOT EXISTS idx_research_claim_sources_claim ON research_claim_sources(claim_id);
CREATE INDEX IF NOT EXISTS idx_research_claim_sources_source ON research_claim_sources(source_id);

-- ----- research_relations
CREATE TABLE IF NOT EXISTS research_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_type TEXT NOT NULL CHECK (from_type IN ( 'research_item', 'casino', 'country', 'category', 'payment_method')),
  from_id TEXT NOT NULL,
  to_type TEXT NOT NULL CHECK (to_type IN ( 'research_item', 'casino', 'country', 'category', 'payment_method')),
  to_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN ( 'covers', 'located_in', 'operates_in', 'regulated_by', 'regulates', 'licensed_by', 'requires', 'uses', 'related_to', 'part_of', 'contains', 'updates', 'supersedes', 'superseded_by', 'cites', 'supports', 'contradicts', 'derived_from', 'mentions', 'affects', 'affected_by', 'applies_to', 'available_in', 'restricted_in')),
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  valid_from DATE,
  valid_until DATE,
  source_id INTEGER REFERENCES research_sources(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (from_type, from_id, to_type, to_id, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_research_relations_from ON research_relations(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_research_relations_to ON research_relations(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_research_relations_type ON research_relations(relation_type);

-- ----- research_item_versions
CREATE TABLE IF NOT EXISTS research_item_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  research_item_id INTEGER NOT NULL REFERENCES research_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_snapshot TEXT NOT NULL,
  changed_by TEXT,
  change_summary TEXT,
  restored_from_version INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (research_item_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_research_item_versions_item ON research_item_versions(research_item_id);

-- ----- research_datasets
CREATE TABLE IF NOT EXISTS research_datasets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  columns_json TEXT NOT NULL DEFAULT '[]',
  rows_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ( 'draft', 'published', 'needs_update', 'archived')),
  published INTEGER NOT NULL DEFAULT 0,
  source_id INTEGER REFERENCES research_sources(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_research_datasets_status ON research_datasets(status);

-- ----- research_dataset_versions
CREATE TABLE IF NOT EXISTS research_dataset_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_id INTEGER NOT NULL REFERENCES research_datasets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  columns_snapshot TEXT NOT NULL,
  rows_snapshot TEXT NOT NULL,
  changed_by TEXT,
  change_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (dataset_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_research_dataset_versions_dataset ON research_dataset_versions(dataset_id);
