-- =====================================================
-- 0016: Seed: role permissions
-- =====================================================
-- The permission matrix for the admin, editor and viewer roles. The Permissions
-- page in the dashboard edits these rows.
--
-- Seeds only add rows that are missing (INSERT OR IGNORE, or NOT EXISTS where
-- the table has no unique key), so a row an editor changed is never overwritten.
-- On a live site a seed row that was deleted on purpose is added back, so run
-- these files on new databases only.

INSERT OR IGNORE INTO permissions (role, resource, action, allowed) VALUES
  -- admin: casinos
  ('admin', 'casinos', 'create', 1),
  ('admin', 'casinos', 'read', 1),
  ('admin', 'casinos', 'update', 1),
  ('admin', 'casinos', 'delete', 1),
  -- admin: reviews
  ('admin', 'reviews', 'create', 1),
  ('admin', 'reviews', 'read', 1),
  ('admin', 'reviews', 'update', 1),
  ('admin', 'reviews', 'delete', 1),
  -- admin: news
  ('admin', 'news', 'create', 1),
  ('admin', 'news', 'read', 1),
  ('admin', 'news', 'update', 1),
  ('admin', 'news', 'delete', 1),
  -- admin: pages
  ('admin', 'pages', 'create', 1),
  ('admin', 'pages', 'read', 1),
  ('admin', 'pages', 'update', 1),
  ('admin', 'pages', 'delete', 1),
  -- admin: components
  ('admin', 'components', 'create', 1),
  ('admin', 'components', 'read', 1),
  ('admin', 'components', 'update', 1),
  ('admin', 'components', 'delete', 1),
  -- admin: seo
  ('admin', 'seo', 'create', 1),
  ('admin', 'seo', 'read', 1),
  ('admin', 'seo', 'update', 1),
  ('admin', 'seo', 'delete', 1),
  -- admin: settings
  ('admin', 'settings', 'read', 1),
  ('admin', 'settings', 'update', 1),
  -- admin: authors
  ('admin', 'authors', 'create', 1),
  ('admin', 'authors', 'read', 1),
  ('admin', 'authors', 'update', 1),
  ('admin', 'authors', 'delete', 1),
  -- admin: categories
  ('admin', 'categories', 'create', 1),
  ('admin', 'categories', 'read', 1),
  ('admin', 'categories', 'update', 1),
  ('admin', 'categories', 'delete', 1),
  -- admin: countries
  ('admin', 'countries', 'create', 1),
  ('admin', 'countries', 'read', 1),
  ('admin', 'countries', 'update', 1),
  ('admin', 'countries', 'delete', 1),
  -- admin: media
  ('admin', 'media', 'create', 1),
  ('admin', 'media', 'read', 1),
  ('admin', 'media', 'delete', 1),
  -- admin: nav
  ('admin', 'nav', 'create', 1),
  ('admin', 'nav', 'read', 1),
  ('admin', 'nav', 'update', 1),
  ('admin', 'nav', 'delete', 1),
  -- admin: permissions
  ('admin', 'permissions', 'read', 1),
  ('admin', 'permissions', 'update', 1),
  -- admin: users
  ('admin', 'users', 'read', 1),
  ('admin', 'users', 'update', 1),
  -- editor: casinos
  ('editor', 'casinos', 'read', 1),
  -- editor: reviews
  ('editor', 'reviews', 'create', 1),
  ('editor', 'reviews', 'read', 1),
  ('editor', 'reviews', 'update', 1),
  -- editor: news
  ('editor', 'news', 'create', 1),
  ('editor', 'news', 'read', 1),
  ('editor', 'news', 'update', 1),
  -- editor: pages
  ('editor', 'pages', 'read', 1),
  -- editor: components
  ('editor', 'components', 'read', 1),
  -- editor: authors
  ('editor', 'authors', 'read', 1),
  -- editor: categories
  ('editor', 'categories', 'read', 1),
  -- editor: countries
  ('editor', 'countries', 'read', 1),
  -- editor: media
  ('editor', 'media', 'create', 1),
  ('editor', 'media', 'read', 1),
  ('editor', 'media', 'update', 1),
  ('editor', 'media', 'delete', 1),
  -- viewer: media
  ('viewer', 'media', 'read', 1),
  -- admin: platform-updates
  ('admin', 'platform-updates', 'create', 1),
  ('admin', 'platform-updates', 'read', 1),
  ('admin', 'platform-updates', 'update', 1),
  ('admin', 'platform-updates', 'delete', 1),
  -- editor: platform-updates
  ('editor', 'platform-updates', 'create', 1),
  ('editor', 'platform-updates', 'read', 1),
  ('editor', 'platform-updates', 'update', 1),
  ('editor', 'platform-updates', 'delete', 1),
  -- editor: affiliate_partners
  ('editor', 'affiliate_partners', 'read', 1),
  ('editor', 'affiliate_partners', 'create', 1),
  ('editor', 'affiliate_partners', 'update', 1),
  ('editor', 'affiliate_partners', 'delete', 0),
  -- editor: affiliate_programs
  ('editor', 'affiliate_programs', 'read', 1),
  ('editor', 'affiliate_programs', 'create', 1),
  ('editor', 'affiliate_programs', 'update', 1),
  ('editor', 'affiliate_programs', 'delete', 0),
  -- editor: affiliate_accounts
  ('editor', 'affiliate_accounts', 'read', 1),
  ('editor', 'affiliate_accounts', 'create', 1),
  ('editor', 'affiliate_accounts', 'update', 1),
  ('editor', 'affiliate_accounts', 'delete', 0),
  -- editor: commercial_terms
  ('editor', 'commercial_terms', 'read', 1),
  ('editor', 'commercial_terms', 'create', 1),
  ('editor', 'commercial_terms', 'update', 1),
  ('editor', 'commercial_terms', 'delete', 0),
  -- editor: offers
  ('editor', 'offers', 'read', 1),
  ('editor', 'offers', 'create', 1),
  ('editor', 'offers', 'update', 1),
  ('editor', 'offers', 'delete', 0),
  -- editor: tracking_links
  ('editor', 'tracking_links', 'read', 1),
  ('editor', 'tracking_links', 'create', 1),
  ('editor', 'tracking_links', 'update', 1),
  ('editor', 'tracking_links', 'delete', 0),
  -- editor: analytics
  ('editor', 'analytics', 'read', 1),
  ('editor', 'analytics', 'create', 0),
  ('editor', 'analytics', 'update', 0),
  ('editor', 'analytics', 'delete', 0),
  -- editor: analytics_conversions
  ('editor', 'analytics_conversions', 'read', 1),
  ('editor', 'analytics_conversions', 'create', 1),
  ('editor', 'analytics_conversions', 'update', 1),
  ('editor', 'analytics_conversions', 'delete', 0),
  -- editor: campaigns
  ('editor', 'campaigns', 'read', 1),
  ('editor', 'campaigns', 'create', 1),
  ('editor', 'campaigns', 'update', 1),
  ('editor', 'campaigns', 'delete', 0),
  -- editor: reports
  ('editor', 'reports', 'read', 1),
  ('editor', 'reports', 'create', 1),
  ('editor', 'reports', 'update', 1),
  ('editor', 'reports', 'delete', 0),
  -- editor: analytics_alerts
  ('editor', 'analytics_alerts', 'read', 1),
  ('editor', 'analytics_alerts', 'create', 0),
  ('editor', 'analytics_alerts', 'update', 1),
  ('editor', 'analytics_alerts', 'delete', 0),
  -- editor: import_batches
  ('editor', 'import_batches', 'read', 1),
  ('editor', 'import_batches', 'create', 1),
  ('editor', 'import_batches', 'update', 0),
  ('editor', 'import_batches', 'delete', 0),
  -- editor: payment_methods
  ('editor', 'payment_methods', 'read', 1),
  ('editor', 'payment_methods', 'create', 1),
  ('editor', 'payment_methods', 'update', 1),
  ('editor', 'payment_methods', 'delete', 1),
  -- editor: research
  ('editor', 'research', 'read', 1),
  ('editor', 'research', 'create', 1),
  ('editor', 'research', 'update', 1),
  ('editor', 'research', 'delete', 1),
  -- editor: research_sources
  ('editor', 'research_sources', 'read', 1),
  ('editor', 'research_sources', 'create', 1),
  ('editor', 'research_sources', 'update', 1),
  ('editor', 'research_sources', 'delete', 1),
  -- editor: research_claims
  ('editor', 'research_claims', 'read', 1),
  ('editor', 'research_claims', 'create', 1),
  ('editor', 'research_claims', 'update', 1),
  ('editor', 'research_claims', 'delete', 1),
  -- editor: research_relations
  ('editor', 'research_relations', 'read', 1),
  ('editor', 'research_relations', 'create', 1),
  ('editor', 'research_relations', 'update', 1),
  ('editor', 'research_relations', 'delete', 1),
  -- editor: research_datasets
  ('editor', 'research_datasets', 'read', 1),
  ('editor', 'research_datasets', 'create', 1),
  ('editor', 'research_datasets', 'update', 1),
  ('editor', 'research_datasets', 'delete', 1),
  -- editor: content_items
  ('editor', 'content_items', 'read', 1),
  ('editor', 'content_items', 'create', 1),
  ('editor', 'content_items', 'update', 1),
  ('editor', 'content_items', 'delete', 0),
  -- editor: comparisons
  ('editor', 'comparisons', 'read', 1),
  ('editor', 'comparisons', 'create', 1),
  ('editor', 'comparisons', 'update', 1),
  ('editor', 'comparisons', 'delete', 0),
  -- editor: custom_content_types
  ('editor', 'custom_content_types', 'read', 1),
  ('editor', 'custom_content_types', 'create', 0),
  ('editor', 'custom_content_types', 'update', 0),
  ('editor', 'custom_content_types', 'delete', 0),
  -- admin: content_items
  ('admin', 'content_items', 'read', 1),
  ('admin', 'content_items', 'create', 1),
  ('admin', 'content_items', 'update', 1),
  ('admin', 'content_items', 'delete', 1),
  -- admin: comparisons
  ('admin', 'comparisons', 'read', 1),
  ('admin', 'comparisons', 'create', 1),
  ('admin', 'comparisons', 'update', 1),
  ('admin', 'comparisons', 'delete', 1),
  -- admin: custom_content_types
  ('admin', 'custom_content_types', 'read', 1),
  ('admin', 'custom_content_types', 'create', 1),
  ('admin', 'custom_content_types', 'update', 1),
  ('admin', 'custom_content_types', 'delete', 1),
  -- admin: news
  ('admin', 'news', 'review', 1),
  ('admin', 'news', 'factcheck', 1),
  ('admin', 'news', 'publish', 1),
  ('admin', 'news', 'schedule', 1),
  ('admin', 'news', 'correct', 1),
  ('admin', 'news', 'retract', 1),
  ('admin', 'news', 'manage_authors', 1),
  ('admin', 'news', 'manage_taxonomy', 1),
  ('admin', 'news', 'manage_sources', 1),
  ('admin', 'news', 'manage_settings', 1),
  ('admin', 'news', 'view_analytics', 1),
  -- editor: content_landing_pages
  ('editor', 'content_landing_pages', 'read', 1),
  ('editor', 'content_landing_pages', 'create', 1),
  ('editor', 'content_landing_pages', 'update', 1),
  ('editor', 'content_landing_pages', 'delete', 0),
  -- admin: content_landing_pages
  ('admin', 'content_landing_pages', 'read', 1),
  ('admin', 'content_landing_pages', 'create', 1),
  ('admin', 'content_landing_pages', 'update', 1),
  ('admin', 'content_landing_pages', 'delete', 1);
