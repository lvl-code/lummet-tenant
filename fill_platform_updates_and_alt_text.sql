-- Fill seo_keywords for platform_updates (2 rows, mined from full article content)
UPDATE platform_updates SET seo_keywords = 'Lummet AI V1.0, Lummet AI Level.casino assistant, Lummet AI conversational casino guide, lummet.level.casino, AI casino chatbot Level.casino, Level.casino AI casino discovery, Level.casino AI casino rankings assistant' WHERE id = 2;
UPDATE platform_updates SET seo_keywords = 'Level.casino platform upgrade 2026, Level.casino database-driven publishing platform, Level.casino structured casino reviews, Level.casino canonical casino slug reviews, Level.casino geo-aware casino availability, Level.casino news editorial system, Level.casino structured SEO metadata' WHERE id = 4;

-- Add missing alt text to images (inferred from surrounding article context -- NOT verified
-- against the actual image pixels, since these images aren't reachable for me to view directly.
-- Please eyeball each one against the real image before treating this as final.)
UPDATE news SET content = REPLACE(content, '<img src="../../media/news/1787691316165-7221fa26f248d820.png">', '<img src="../../media/news/1787691316165-7221fa26f248d820.png" alt="AI-powered casino host technology managing table games">') WHERE id = 18;
UPDATE news SET content = REPLACE(content, '<img src="../../media/news/1787726066765-675303bbaab8cebe.jpg">', '<img src="../../media/news/1787726066765-675303bbaab8cebe.jpg" alt="Comparison of AI casino hosts and human casino hosts">') WHERE id = 18;
UPDATE news SET content = REPLACE(content, '<img src="../../media/news/1787691251736-1794d41e65ca1b5b.png">', '<img src="../../media/news/1787691251736-1794d41e65ca1b5b.png" alt="AI dealer technology for online casino and sportsbook operations">') WHERE id = 18;
UPDATE news SET content = REPLACE(content, '<img src="../../media/news/1787724816021-54b881796c978d2c.jpg">', '<img src="../../media/news/1787724816021-54b881796c978d2c.jpg" alt="Online sports betting activity during Mexico''s 2026 World Cup">') WHERE id = 19;
UPDATE news SET content = REPLACE(content, '<img src="../../media/news/1787724862909-b6b5f88ffaaf6ace.jpg">', '<img src="../../media/news/1787724862909-b6b5f88ffaaf6ace.jpg" alt="Mobile payment methods used for online betting in Mexico">') WHERE id = 19;
UPDATE news SET content = REPLACE(content, '<img src="../../media/news/1787913987944-c13d71adc2e16d47.png">', '<img src="../../media/news/1787913987944-c13d71adc2e16d47.png" alt="Comparison of Alberta and Ontario online gambling markets">') WHERE id = 22;
UPDATE platform_updates SET content = REPLACE(content, '<img src="../../media/updates/1787728418236-30c0e50972a0b960.jpg">', '<img src="../../media/updates/1787728418236-30c0e50972a0b960.jpg" alt="Level.casino database-driven publishing platform architecture">') WHERE id = 4;
