-- =====================================================
-- 0018: Seed: navigation and media folders
-- =====================================================
-- The header, footer and page navigation links, and the default media folders.
--
-- Seeds only add rows that are missing (INSERT OR IGNORE, or NOT EXISTS where
-- the table has no unique key), so a row an editor changed is never overwritten.
-- On a live site a seed row that was deleted on purpose is added back, so run
-- these files on new databases only.

-- Navigation links (nav_items has no unique key, so each row is guarded by url + location, so a renamed link is not added again)
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Home', '/en', 1, 'header', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en' AND location = 'header');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Casinos', '/en/casino', 2, 'header', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/casino' AND location = 'header');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Reviews', '/en/review', 3, 'header', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/review' AND location = 'header');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'News', '/en/news', 4, 'header', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/news' AND location = 'header');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Categories', '/en/category', 5, 'header', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/category' AND location = 'header');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Countries', '/en/country', 6, 'header', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/country' AND location = 'header');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Dashboard', '/en/dashboard', 7, 'header', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/dashboard' AND location = 'header');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'All Casinos', '/en/casino', 1, 'footer_casinos', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/casino' AND location = 'footer_casinos');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Reviews', '/en/review', 2, 'footer_casinos', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/review' AND location = 'footer_casinos');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Crypto Casinos', '/en/category/crypto', 3, 'footer_casinos', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/category/crypto' AND location = 'footer_casinos');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Categories', '/en/category', 4, 'footer_casinos', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/category' AND location = 'footer_casinos');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Countries', '/en/country', 5, 'footer_casinos', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/country' AND location = 'footer_casinos');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'About Us', '/en/about-us', 1, 'footer_company', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/about-us' AND location = 'footer_company');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Contact', '/en/contact', 2, 'footer_company', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/contact' AND location = 'footer_company');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'News', '/en/news', 3, 'footer_company', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/news' AND location = 'footer_company');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Responsible Gaming', '/en/responsible-gambling', 1, 'footer_support', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/responsible-gambling' AND location = 'footer_support');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'GambleAware', 'https://www.gambleaware.org/', 2, 'footer_support', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = 'https://www.gambleaware.org/' AND location = 'footer_support');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'GamCare', 'https://www.gamcare.org.uk/', 3, 'footer_support', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = 'https://www.gamcare.org.uk/' AND location = 'footer_support');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Gambling Therapy', 'https://www.gamblingtherapy.org/', 4, 'footer_support', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = 'https://www.gamblingtherapy.org/' AND location = 'footer_support');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Privacy Policy', '/en/privacy', 1, 'footer_legal', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/privacy' AND location = 'footer_legal');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Terms of Service', '/en/terms', 2, 'footer_legal', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/terms' AND location = 'footer_legal');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Cookie Policy', '/en/cookies', 3, 'footer_legal', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/cookies' AND location = 'footer_legal');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'All Casinos', '/en/casino', 1, 'page', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/casino' AND location = 'page');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Reviews', '/en/review', 2, 'page', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/review' AND location = 'page');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Categories', '/en/category', 3, 'page', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/category' AND location = 'page');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'Countries', '/en/country', 4, 'page', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/country' AND location = 'page');
INSERT INTO nav_items (label, url, position, location, is_external, icon, enabled)
SELECT 'News', '/en/news', 5, 'page', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/en/news' AND location = 'page');

-- Media folders
INSERT OR IGNORE INTO media_folders (name, slug) VALUES
  ('General', 'general'),
  ('Logos', 'logos'),
  ('Banners', 'banners'),
  ('Reviews', 'reviews'),
  ('News', 'news'),
  ('Pages', 'pages'),
  ('Videos', 'videos');
