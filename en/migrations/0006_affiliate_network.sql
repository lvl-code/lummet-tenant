-- =====================================================
-- 0006: Affiliate network, offers and tracking links
-- =====================================================
-- Partners, programs, accounts, commercial terms, offers and their versions,
-- tracking links with geo destinations and health checks, and click logs.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- affiliates
CREATE TABLE IF NOT EXISTS affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  casino_slug TEXT,
  network TEXT,
  manager_name TEXT,
  manager_email TEXT,
  revshare REAL,
  cpa REAL,
  hybrid TEXT,
  tracking_url TEXT,
  status TEXT DEFAULT 'active'
);

-- ----- affiliate_partners
CREATE TABLE IF NOT EXISTS affiliate_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  website TEXT,
  description TEXT,
  partner_type TEXT DEFAULT 'network',
  status TEXT DEFAULT 'active',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  external_reference TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_slug ON affiliate_partners(slug);
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_status ON affiliate_partners(status);

-- ----- affiliate_partner_contacts
CREATE TABLE IF NOT EXISTS affiliate_partner_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL REFERENCES affiliate_partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_partner_contacts_partner ON affiliate_partner_contacts(partner_id);

-- ----- affiliate_programs
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL REFERENCES affiliate_partners(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  portal_url TEXT,
  supported_geos TEXT,
  reporting_notes TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_partner ON affiliate_programs(partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_programs_status ON affiliate_programs(status);

-- ----- affiliate_program_casinos
CREATE TABLE IF NOT EXISTS affiliate_program_casinos (
  program_id INTEGER NOT NULL REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  casino_id INTEGER NOT NULL REFERENCES casinos(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (program_id, casino_id)
);
CREATE INDEX IF NOT EXISTS idx_program_casinos_casino ON affiliate_program_casinos(casino_id);

-- ----- affiliate_accounts
CREATE TABLE IF NOT EXISTS affiliate_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES affiliate_programs(id) ON DELETE RESTRICT,
  account_name TEXT NOT NULL,
  external_account_id TEXT,
  status TEXT DEFAULT 'active',
  portal_url TEXT,
  notes TEXT,
  credential_reference TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_affiliate_accounts_program ON affiliate_accounts(program_id);

-- ----- affiliate_commercial_terms
CREATE TABLE IF NOT EXISTS affiliate_commercial_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES affiliate_programs(id) ON DELETE RESTRICT,
  account_id INTEGER REFERENCES affiliate_accounts(id) ON DELETE RESTRICT,
  casino_id INTEGER REFERENCES casinos(id),
  geo_code TEXT,
  term_type TEXT NOT NULL,
  cpa_amount REAL,
  revshare_percent REAL,
  hybrid_cpa_amount REAL,
  hybrid_revshare_percent REAL,
  fixed_fee_amount REAL,
  currency TEXT DEFAULT 'USD',
  custom_terms_json TEXT,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_commercial_terms_account ON affiliate_commercial_terms(account_id);
CREATE INDEX IF NOT EXISTS idx_commercial_terms_casino ON affiliate_commercial_terms(casino_id);
CREATE INDEX IF NOT EXISTS idx_commercial_terms_lookup ON affiliate_commercial_terms(program_id, account_id, casino_id, geo_code, effective_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_commercial_terms_program ON affiliate_commercial_terms(program_id);

-- ----- offers
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  casino_id INTEGER NOT NULL REFERENCES casinos(id),
  program_id INTEGER REFERENCES affiliate_programs(id),
  offer_type TEXT NOT NULL,
  internal_name TEXT NOT NULL,
  public_headline TEXT,
  public_description TEXT,
  bonus_amount REAL,
  bonus_percent REAL,
  currency TEXT,
  free_spins_qty INTEGER,
  min_deposit REAL,
  max_bonus REAL,
  wagering_multiplier REAL,
  max_bet REAL,
  eligible_games TEXT,
  terms_and_conditions TEXT,
  start_date DATETIME,
  expiry_date DATETIME,
  status TEXT DEFAULT 'draft',
  priority INTEGER DEFAULT 0,
  allowed_geos TEXT,
  blocked_geos TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_offers_casino ON offers(casino_id);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_offers_program ON offers(program_id);
CREATE INDEX IF NOT EXISTS idx_offers_selection ON offers(casino_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- ----- offer_versions
CREATE TABLE IF NOT EXISTS offer_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  valid_from DATETIME NOT NULL,
  valid_to DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(offer_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_offer_versions_lookup ON offer_versions(offer_id, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_offer_versions_offer ON offer_versions(offer_id);

-- ----- tracking_links
CREATE TABLE IF NOT EXISTS tracking_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  internal_name TEXT NOT NULL,
  tracking_code TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  casino_id INTEGER REFERENCES casinos(id),
  partner_id INTEGER REFERENCES affiliate_partners(id),
  program_id INTEGER REFERENCES affiliate_programs(id),
  offer_id INTEGER REFERENCES offers(id),
  campaign TEXT,
  source TEXT,
  medium TEXT,
  content TEXT,
  allowed_geos TEXT,
  blocked_geos TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  health_status TEXT DEFAULT 'unknown',
  health_checked_at DATETIME,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  campaign_id INTEGER REFERENCES campaigns(id)
);
CREATE INDEX IF NOT EXISTS idx_tracking_links_campaign ON tracking_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_casino ON tracking_links(casino_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(tracking_code);
CREATE INDEX IF NOT EXISTS idx_tracking_links_health ON tracking_links(health_status);
CREATE INDEX IF NOT EXISTS idx_tracking_links_offer ON tracking_links(offer_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_selection ON tracking_links(casino_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_tracking_links_status ON tracking_links(status);

-- ----- tracking_link_geo_destinations
CREATE TABLE IF NOT EXISTS tracking_link_geo_destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_link_id INTEGER NOT NULL REFERENCES tracking_links(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tracking_link_id, country_code)
);
CREATE INDEX IF NOT EXISTS idx_tl_geo_dest_link ON tracking_link_geo_destinations(tracking_link_id);

-- ----- tracking_link_health_checks
CREATE TABLE IF NOT EXISTS tracking_link_health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_link_id INTEGER NOT NULL REFERENCES tracking_links(id) ON DELETE CASCADE,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  http_status INTEGER,
  final_url TEXT,
  redirect_count INTEGER,
  response_time_ms INTEGER,
  error_type TEXT,
  error_message TEXT,
  health_status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tl_health_link ON tracking_link_health_checks(tracking_link_id, checked_at);

-- ----- clicks
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  casino_slug TEXT NOT NULL,
  country_code TEXT,
  city TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tracking_link_id INTEGER REFERENCES tracking_links(id),
  offer_id INTEGER REFERENCES offers(id)
);
CREATE INDEX IF NOT EXISTS idx_clicks_casino ON clicks(casino_slug);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON clicks(created_at);
