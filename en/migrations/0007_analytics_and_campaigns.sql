-- =====================================================
-- 0007: Analytics, campaigns and conversions
-- =====================================================
-- Event tracking and daily roll-ups, conversions, campaigns, alert rules,
-- postbacks, import batches and provider adapters.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  casino_id INTEGER REFERENCES casinos(id),
  review_id INTEGER REFERENCES reviews(id),
  page_id INTEGER REFERENCES pages(id),
  news_id INTEGER REFERENCES news(id),
  offer_id INTEGER REFERENCES offers(id),
  offer_version_id INTEGER REFERENCES offer_versions(id),
  tracking_link_id INTEGER REFERENCES tracking_links(id),
  partner_id INTEGER REFERENCES affiliate_partners(id),
  program_id INTEGER REFERENCES affiliate_programs(id),
  account_id INTEGER REFERENCES affiliate_accounts(id),
  campaign_id INTEGER,
  country_code TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  landing_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  session_id TEXT,
  visitor_hash TEXT,
  click_id TEXT,
  user_id INTEGER REFERENCES users(id),
  value REAL,
  currency TEXT,
  metadata TEXT,
  is_bot INTEGER DEFAULT 0,
  is_duplicate INTEGER DEFAULT 0,
  content_item_id INTEGER REFERENCES content_items(id)
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign ON analytics_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_casino ON analytics_events(casino_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_click_id ON analytics_events(click_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_content_item ON analytics_events(content_item_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country ON analytics_events(country_code, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_news ON analytics_events(news_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_offer ON analytics_events(offer_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_partner ON analytics_events(partner_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tracking_link ON analytics_events(tracking_link_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time ON analytics_events(event_type, occurred_at);

-- ----- analytics_daily
CREATE TABLE IF NOT EXISTS analytics_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  dimension_type TEXT NOT NULL,
  dimension_id INTEGER,
  page_views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  commission REAL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, dimension_type, dimension_id, currency)
);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_lookup ON analytics_daily(dimension_type, dimension_id, date);

-- ----- analytics_conversions
CREATE TABLE IF NOT EXISTS analytics_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  click_id TEXT,
  tracking_link_id INTEGER REFERENCES tracking_links(id),
  offer_id INTEGER REFERENCES offers(id),
  casino_id INTEGER REFERENCES casinos(id),
  partner_id INTEGER REFERENCES affiliate_partners(id),
  program_id INTEGER REFERENCES affiliate_programs(id),
  account_id INTEGER REFERENCES affiliate_accounts(id),
  commercial_term_id INTEGER REFERENCES affiliate_commercial_terms(id),
  campaign_id INTEGER,
  conversion_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reported_value REAL,
  calculated_commission REAL,
  currency TEXT NOT NULL DEFAULT 'USD',
  country_code TEXT,
  external_reference TEXT,
  occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  source TEXT NOT NULL DEFAULT 'manual',
  reported_commission REAL,
  external_player_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_conversions_account ON analytics_conversions(account_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_conversions_campaign ON analytics_conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversions_click ON analytics_conversions(click_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_external_ref_source ON analytics_conversions(account_id, external_reference, source);
CREATE INDEX IF NOT EXISTS idx_conversions_link ON analytics_conversions(tracking_link_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_conversions_player ON analytics_conversions(account_id, external_player_id);
CREATE INDEX IF NOT EXISTS idx_conversions_source ON analytics_conversions(source, occurred_at);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON analytics_conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_type ON analytics_conversions(conversion_type, occurred_at);

-- ----- campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ----- analytics_alert_rules
CREATE TABLE IF NOT EXISTS analytics_alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'global',
  scope_id INTEGER,
  threshold_type TEXT NOT NULL,
  threshold_value REAL,
  comparison_window_days INTEGER NOT NULL DEFAULT 7,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON analytics_alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_scope ON analytics_alert_rules(scope_type, scope_id);

-- ----- analytics_alerts
CREATE TABLE IF NOT EXISTS analytics_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER REFERENCES analytics_alert_rules(id),
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  details_json TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  acknowledged_by INTEGER REFERENCES users(id),
  acknowledged_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_alerts_rule ON analytics_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON analytics_alerts(status, triggered_at);

-- ----- postback_configs
CREATE TABLE IF NOT EXISTS postback_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES affiliate_accounts(id) ON DELETE RESTRICT,
  label TEXT NOT NULL,
  endpoint_token TEXT UNIQUE NOT NULL,
  auth_method TEXT NOT NULL,
  credential_reference TEXT NOT NULL,
  signature_param TEXT,
  timestamp_param TEXT,
  timestamp_tolerance_seconds INTEGER DEFAULT 300,
  allowed_ips TEXT,
  field_mapping_json TEXT,
  status TEXT DEFAULT 'active',
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_postback_configs_account ON postback_configs(account_id);
CREATE INDEX IF NOT EXISTS idx_postback_configs_status ON postback_configs(status);

-- ----- postback_logs
CREATE TABLE IF NOT EXISTS postback_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  postback_config_id INTEGER REFERENCES postback_configs(id) ON DELETE SET NULL,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  source_ip TEXT,
  outcome TEXT NOT NULL,
  reason TEXT,
  click_id TEXT,
  external_reference TEXT,
  conversion_id INTEGER REFERENCES analytics_conversions(id) ON DELETE SET NULL,
  normalized_payload_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_postback_logs_config ON postback_logs(postback_config_id, received_at);
CREATE INDEX IF NOT EXISTS idx_postback_logs_outcome ON postback_logs(outcome, received_at);

-- ----- import_batches
CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES affiliate_accounts(id) ON DELETE RESTRICT,
  label TEXT,
  format TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  unattributed_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_import_batches_account ON import_batches(account_id, created_at);

-- ----- provider_adapter_configs
CREATE TABLE IF NOT EXISTS provider_adapter_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES affiliate_accounts(id) ON DELETE RESTRICT,
  label TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  credential_reference TEXT NOT NULL,
  auth_header_name TEXT,
  auth_scheme TEXT,
  conversions_path TEXT,
  date_param_since TEXT,
  date_param_until TEXT,
  response_array_path TEXT,
  field_mapping_json TEXT,
  sync_frequency_minutes INTEGER NOT NULL DEFAULT 60,
  last_sync_at DATETIME,
  last_sync_status TEXT,
  last_sync_error TEXT,
  status TEXT DEFAULT 'active',
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_provider_adapter_configs_account ON provider_adapter_configs(account_id);
CREATE INDEX IF NOT EXISTS idx_provider_adapter_configs_status ON provider_adapter_configs(status);
