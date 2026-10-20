-- =====================================================
-- 0020: Seed: newsroom sections and regions
-- =====================================================
-- The default news sections and the regions used to group countries.
--
-- Seeds only add rows that are missing (INSERT OR IGNORE, or NOT EXISTS where
-- the table has no unique key), so a row an editor changed is never overwritten.
-- On a live site a seed row that was deleted on purpose is added back, so run
-- these files on new databases only.

-- Sections
INSERT OR IGNORE INTO news_sections (slug, name, display_order) VALUES
  ('regulation', 'Regulation', 1),
  ('markets', 'Markets', 2),
  ('operators', 'Operators', 3),
  ('companies', 'Companies', 4),
  ('technology', 'Technology', 5),
  ('payments', 'Payments', 6),
  ('sports-betting', 'Sports Betting', 7),
  ('online-casinos', 'Online Casinos', 8),
  ('responsible-gambling', 'Responsible Gambling', 9),
  ('legal-compliance', 'Legal & Compliance', 10),
  ('research-analysis', 'Research & Analysis', 11);

-- Regions
INSERT OR IGNORE INTO news_regions (slug, name, display_order) VALUES
  ('europe', 'Europe', 1),
  ('north-america', 'North America', 2),
  ('latin-america', 'Latin America', 3),
  ('asia', 'Asia', 4),
  ('africa', 'Africa', 5),
  ('oceania', 'Oceania', 6),
  ('middle-east', 'Middle East', 7);
