-- =====================================================
-- 0017: Seed: site settings and feature flags
-- =====================================================
-- system_settings holds the feature flags and cron switches (all off by default);
-- settings holds the content types that are switched on.
--
-- Seeds only add rows that are missing (INSERT OR IGNORE, or NOT EXISTS where
-- the table has no unique key), so a row an editor changed is never overwritten.
-- On a live site a seed row that was deleted on purpose is added back, so run
-- these files on new databases only.

-- Feature flags and cron switches
INSERT OR IGNORE INTO system_settings (key, value) VALUES
  ('item_access_default_scope', 'all'),
  ('tracking_link_health_cron_enabled', 'false'),
  ('provider_sync_cron_enabled', 'false'),
  ('research_source_health_cron_enabled', 'false'),
  ('news_v2_homepage', 'false'),
  ('news_editorial_workflow', 'false'),
  ('news_new_taxonomy', 'false'),
  ('news_entity_pages', 'false'),
  ('news_trending', 'false'),
  ('news_corrections_display', 'false'),
  ('news_sources_display', 'false'),
  ('news_google_sitemap', 'false'),
  ('news_analytics_enrichment', 'false'),
  ('news_search_v2', 'false');

-- Enabled content types
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('content_types_enabled', '{"casino":true,"sportsbook":false,"affiliate_partner":false,"custom":false}');
