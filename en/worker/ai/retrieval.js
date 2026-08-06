// =====================================================
// LUMMET AI — Database Retrieval (RAG Layer)
// Schema-matched to Level.casino D1 production tables
// =====================================================

const MAX_RESULTS = 8;
const MAX_CONTENT_LENGTH = 500;

// Country name → ISO code mapping
const COUNTRY_NAME_TO_CODE = {
  'rwanda':'RW','united states':'US','usa':'US','america':'US','canada':'CA',
  'united kingdom':'GB','uk':'GB','england':'GB','germany':'DE','france':'FR',
  'italy':'IT','spain':'ES','netherlands':'NL','holland':'NL','australia':'AU',
  'new zealand':'NZ','japan':'JP','china':'CN','india':'IN','brazil':'BR',
  'mexico':'MX','south africa':'ZA','nigeria':'NG','kenya':'KE','egypt':'EG',
  'sweden':'SE','norway':'NO','denmark':'DK','finland':'FI','poland':'PL',
  'portugal':'PT','greece':'GR','turkey':'TR','russia':'RU','ukraine':'UA',
  'united arab emirates':'AE','saudi arabia':'SA','qatar':'QA','south korea':'KR',
  'korea':'KR','thailand':'TH','vietnam':'VN','philippines':'PH','indonesia':'ID',
  'malaysia':'MY','singapore':'SG','argentina':'AR','chile':'CL','colombia':'CO',
  'peru':'PE','austria':'AT','switzerland':'CH','ireland':'IE','belgium':'BE',
  'czech republic':'CZ','hungary':'HU','romania':'RO','bulgaria':'BG',
  'croatia':'HR','malta':'MT','cyprus':'CY','luxembourg':'LU','iceland':'IS'
};

function truncate(text, max = MAX_CONTENT_LENGTH) {
  if (!text) return '';
  const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.substring(0, max) + '...' : clean;
}

/**
 * Extract meaningful search keywords from a user message
 * Strips question words, filler, and keeps entity names + nouns
 */
function extractSearchTerms(message) {
  const text = message.toLowerCase().trim();

  const stopWords = [
    'what','which','how','why','when','where','who','whom','whose',
    'is','are','was','were','be','been','being','do','does','did','done',
    'can','could','should','would','will','shall','may','might','must',
    'the','a','an','this','that','these','those','there','here',
    'about','tell','show','give','list','find','search','me','us',
    'please','help','want','need','know','think','see','get',
    'available','all','best','top','good','great','nice',
    'casino','casinos','review','reviews','page','pages',
    'my','your','our','their','his','her','its',
    'in','on','at','to','for','of','with','from','by','and','or','but',
    'country','countries','jurisdiction'
  ];

  const words = text.split(/[^a-z0-9.]+/i).filter(w => w.length > 1);
  const keywords = words.filter(w => !stopWords.includes(w));

  const casinoNames = extractCasinoNamesFromText(message);

  const allTerms = [...new Set([...keywords, ...casinoNames])];

  return allTerms.length > 0 ? allTerms : [];
}

/**
 * Extract country code from message — handles both names and codes
 */
function extractCountryFromMessage(message) {
  const text = message.toLowerCase();

  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (text.includes(name)) return code;
  }

  const codePattern = /\b(US|CA|GB|DE|FR|IT|ES|NL|AU|NZ|JP|CN|IN|BR|MX|ZA|NG|KE|EG|SE|NO|DK|FI|PL|PT|GR|TR|RU|UA|AE|SA|QA|KR|TH|VN|PH|ID|MY|SG|AR|CL|CO|PE|AT|CH|IE|BE|CZ|HU|RO|BG|HR|MT|CY|LU|IS|RW)\b/;
  const match = message.match(codePattern);
  if (match) return match[1];

  return null;
}

/**
 * Main retrieval function — searches across all relevant tables
 */
export async function retrieve(env, query, country, intent, entities, conversationHistory) {
  const db = env.DB;
  const text = query.toLowerCase().trim();
  const searchTerms = extractSearchTerms(query);
  const detectedCountry = extractCountryFromMessage(query) || country;

  const results = {
    casinos: [],
    reviews: [],
    reviewBlocks: [],
    news: [],
    pages: [],
    faqs: [],
    authors: [],
    countries: [],
    categories: [],
    seoMeta: [],
    geoStatuses: {},
    casinoCategories: {}
  };

  // ── Detect listing/browsing intent ──
  const isListingQuery =
    text.includes('list') ||
    text.includes('all casinos') ||
    text.includes('available casinos') ||
    text.includes('top casinos') ||
    text.includes('best casinos') ||
    text.includes('show me') ||
    text.includes('what casinos') ||
    text.includes('which casinos') ||
    text.includes('casinos are available') ||
    text.includes('casinos do you have') ||
    text.includes('casinos do you know');

  // ── Detect geo-specific query ──
  const isGeoQuery =
    intent === 'geo' ||
    text.includes('available in') ||
    text.includes('can i play') ||
    text.includes('my country') ||
    text.includes('restricted in') ||
    text.includes('allowed in') ||
    (text.includes('which casinos') && (text.includes('country') || text.includes('available')));

  // ── Detect review listing ──
  const isReviewListing =
    text.includes('what review') ||
    text.includes('which review') ||
    text.includes('all reviews') ||
    text.includes('reviews are available') ||
    text.includes('reviews do you have') ||
    text.includes('list of reviews') ||
    (intent === 'casino_review' && !searchTerms.some(t => t.length > 2 && !['review', 'reviews', 'casino', 'casinos'].includes(t)));

  // ═══════════════════════════════════════════════════
  // CASINOS
  // Schema: id, slug, name, logo, website_url, affiliate_url, rating,
  //   bonus_title, bonus_value, license, owner, features,
  //   supported_countries, restricted_countries, seo_title, seo_description,
  //   published, featured, sort_order, status
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['casino_search', 'casino_review', 'casino_compare', 'bonuses', 'crypto', 'payments', 'geo', 'general'])) {
    try {
      // ── Geo-specific: find casinos available in a specific country ──
      if (isGeoQuery && detectedCountry) {
        const geoR = await db.prepare(`
          SELECT gr.casino_slug, gr.status, gr.bonus_override,
                 c.name, c.rating, c.bonus_title, c.bonus_value,
                 c.license, c.owner, c.features, c.slug
          FROM geo_rules gr
          JOIN casinos c ON c.slug = gr.casino_slug
          WHERE gr.country_code = ? AND gr.status = 'allowed' AND c.published = 1
          ORDER BY c.featured DESC, c.rating DESC
          LIMIT 20
        `).bind(detectedCountry.toUpperCase()).all();

        if (geoR.results && geoR.results.length > 0) {
          results.casinos = geoR.results.map(c => ({
            slug: c.slug || c.casino_slug,
            name: c.name,
            rating: c.rating,
            bonus_title: c.bonus_override || c.bonus_title,
            bonus_value: c.bonus_value,
            license: c.license,
            owner: c.owner,
            features: c.features
          }));
          for (const c of results.casinos) {
            results.geoStatuses[c.slug] = 'allowed';
          }
        } else {
          // Method 2: Check casinos that list this country in supported_countries
          const supportedR = await db.prepare(`
            SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                   features, supported_countries, restricted_countries
            FROM casinos
            WHERE published = 1
            AND (
              LOWER(supported_countries) LIKE ?
              OR LOWER(supported_countries) LIKE ?
            )
            AND LOWER(restricted_countries) NOT LIKE ?
            ORDER BY featured DESC, rating DESC
            LIMIT 20
          `).bind(
            `%${detectedCountry.toLowerCase()}%`,
            `%"${detectedCountry.toUpperCase()}"%`,
            `%${detectedCountry.toLowerCase()}%`
          ).all();

          if (supportedR.results && supportedR.results.length > 0) {
            results.casinos = supportedR.results;
            for (const c of results.casinos) {
              results.geoStatuses[c.slug] = 'allowed';
            }
          } else {
            // Method 3: Return all published casinos and evaluate geo per casino
            const allR = await db.prepare(`
              SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                     features, supported_countries, restricted_countries, featured
              FROM casinos
              WHERE published = 1
              ORDER BY featured DESC, rating DESC, sort_order ASC
              LIMIT 20
            `).all();

            results.casinos = allR.results || [];
            for (const c of results.casinos) {
              results.geoStatuses[c.slug] = evaluateGeoFromColumns(c, detectedCountry);
            }
          }
        }
      }
      // ── Listing query: return all published casinos ──
      else if (isListingQuery) {
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                 features, supported_countries, restricted_countries, featured
          FROM casinos
          WHERE published = 1
          ORDER BY featured DESC, rating DESC, sort_order ASC
          LIMIT 20
        `).all();
        results.casinos = r.results || [];
      }
      // ── Name search: search by extracted keywords ──
      else if (searchTerms.length > 0) {
        const conditions = searchTerms.map(() =>
          'LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(bonus_title) LIKE ? OR LOWER(features) LIKE ?'
        ).join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                 features, supported_countries, restricted_countries, featured
          FROM casinos
          WHERE published = 1
          AND (${conditions})
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.casinos = r.results || [];
      }
      // ── Fallback: return top casinos ──
      else if (intent === 'casino_search' || intent === 'general') {
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                 features, supported_countries, restricted_countries, featured
          FROM casinos
          WHERE published = 1
          ORDER BY featured DESC, rating DESC, sort_order ASC
          LIMIT 10
        `).all();
        results.casinos = r.results || [];
      }

      // ── Parse features for all found casinos ──
      for (const casino of results.casinos) {
        try {
          casino.parsedFeatures = casino.features ? JSON.parse(casino.features) : [];
        } catch {
          casino.parsedFeatures = casino.features ? casino.features.split(',').map(f => f.trim()).filter(Boolean) : [];
        }
      }

      // ── Get geo statuses from geo_rules if not already set ──
      if (results.casinos.length > 0 && detectedCountry) {
        const slugs = results.casinos.map(c => c.slug).filter(Boolean);
        if (slugs.length > 0) {
          const placeholders = slugs.map(() => '?').join(',');
          const geoR = await db.prepare(`
            SELECT casino_slug, country_code, status, bonus_override, priority
            FROM geo_rules
            WHERE casino_slug IN (${placeholders})
            ORDER BY priority DESC
          `).bind(...slugs).all();

          const rulesByCasino = {};
          for (const row of (geoR.results || [])) {
            if (!rulesByCasino[row.casino_slug]) rulesByCasino[row.casino_slug] = [];
            rulesByCasino[row.casino_slug].push(row);
          }

          for (const casino of results.casinos) {
            if (!results.geoStatuses[casino.slug]) {
              const rules = rulesByCasino[casino.slug] || [];
              results.geoStatuses[casino.slug] = evaluateGeoStatus(rules, detectedCountry, casino);
            }
          }
        }
      }

      // ── Get casino categories via junction table ──
      if (results.casinos.length > 0) {
        for (const casino of results.casinos) {
          try {
            const catR = await db.prepare(`
              SELECT c.slug, c.name
              FROM categories c
              JOIN casino_categories cc ON cc.category_id = c.id
              JOIN casinos cas ON cas.id = cc.casino_id
              WHERE cas.slug = ?
            `).bind(casino.slug).all();
            if (catR.results && catR.results.length > 0) {
              results.casinoCategories[casino.slug] = catR.results;
            }
          } catch {}
        }
      }
    } catch (e) { console.error('Lummet retrieve casinos:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // REVIEWS
  // Schema: id, casino_slug, country_code, slug, title, content, pros, cons,
  //   rating, seo_title, seo_description, ai_generated, published, overview,
  //   games, bonuses, payments, licenses, faq_json, verdict, author, author_title
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['casino_review', 'casino_compare', 'general'])) {
    try {
      if (isReviewListing) {
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, country_code, rating, overview,
                 pros, cons, verdict, author, author_title
          FROM reviews
          WHERE published = 1
          ORDER BY created_at DESC
          LIMIT 20
        `).all();
        results.reviews = (r.results || []).map(rv => ({
          ...rv,
          overview: truncate(rv.overview, 300),
          verdict: truncate(rv.verdict, 200)
        }));
      } else if (searchTerms.length > 0) {
        const conditions = searchTerms.map(() =>
          'LOWER(title) LIKE ? OR LOWER(casino_slug) LIKE ? OR LOWER(overview) LIKE ?'
        ).join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, country_code, rating, overview,
                 pros, cons, verdict, author, author_title,
                 games, bonuses, payments, licenses
          FROM reviews
          WHERE published = 1
          AND (${conditions})
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.reviews = (r.results || []).map(rv => ({
          ...rv,
          overview: truncate(rv.overview, 300),
          games: truncate(rv.games, 200),
          bonuses: truncate(rv.bonuses, 200),
          payments: truncate(rv.payments, 200),
          licenses: truncate(rv.licenses, 200),
          verdict: truncate(rv.verdict, 200)
        }));
      }

      // ── Get review blocks for detailed sections ──
      // Schema: id, review_slug, title, content, position
      if (results.reviews.length > 0 && (intent === 'casino_review' || intent === 'casino_compare')) {
        const reviewSlugs = results.reviews.map(r => r.slug).filter(Boolean);
        if (reviewSlugs.length > 0) {
          const placeholders = reviewSlugs.map(() => '?').join(',');
          const blocksR = await db.prepare(`
            SELECT review_slug, title, content, position
            FROM review_blocks
            WHERE review_slug IN (${placeholders})
            ORDER BY position ASC
          `).bind(...reviewSlugs).all();
          results.reviewBlocks = (blocksR.results || []).map(b => ({
            ...b,
            content: truncate(b.content, 300)
          }));
        }
      }

      // ── Parse faq_json for reviews ──
      for (const review of results.reviews) {
        try {
          const faqRow = await db.prepare(`
            SELECT faq_json FROM reviews WHERE slug = ?
          `).bind(review.slug).first();
          if (faqRow?.faq_json) {
            review.faqs = JSON.parse(faqRow.faq_json);
          }
        } catch {}
      }
    } catch (e) { console.error('Lummet retrieve reviews:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // NEWS
  // Schema: id, slug, title, content, author, ai_generated, seo_title,
  //   seo_description, published, excerpt, tags, author_id, published_at
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['news', 'general'])) {
    try {
      if (text.includes('news') || text.includes('latest') || text.includes('update')) {
        const r = await db.prepare(`
          SELECT slug, title, excerpt, tags, author, published_at
          FROM news
          WHERE published = 1
          ORDER BY published_at DESC, created_at DESC
          LIMIT ${MAX_RESULTS}
        `).all();
        results.news = (r.results || []).map(n => ({
          ...n,
          excerpt: truncate(n.excerpt, 200)
        }));
      } else if (searchTerms.length > 0) {
        const conditions = searchTerms.map(() =>
          'LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(tags) LIKE ?'
        ).join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, title, excerpt, tags, author, published_at
          FROM news
          WHERE published = 1
          AND (${conditions})
          ORDER BY published_at DESC
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.news = (r.results || []).map(n => ({
          ...n,
          excerpt: truncate(n.excerpt, 200)
        }));
      }
    } catch (e) { console.error('Lummet retrieve news:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // PAGES
  // Schema: id, slug, title, content, type, author_id, seo_title,
  //   seo_description, published, created_at, updated_at
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['general', 'educational', 'responsible_gambling', 'navigation'])) {
    try {
      if (searchTerms.length > 0) {
        const conditions = searchTerms.map(() =>
          'LOWER(title) LIKE ? OR LOWER(slug) LIKE ?'
        ).join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, title, type
          FROM pages
          WHERE published = 1
          AND (${conditions})
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.pages = r.results || [];
      } else if (intent === 'navigation' || text.includes('level.casino') || text.includes('what is')) {
        const r = await db.prepare(`
          SELECT slug, title, type
          FROM pages
          WHERE published = 1
          AND slug IN ('about', 'about-us', 'contact', 'responsible-gambling', 'terms', 'privacy', 'faq')
          LIMIT 10
        `).all();
        results.pages = r.results || [];
      }
    } catch (e) { console.error('Lummet retrieve pages:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // FAQs
  // Schema: id, slug, question, answer, is_active, created_at, updated_at
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['faq', 'general', 'educational', 'responsible_gambling'])) {
    try {
      if (searchTerms.length > 0) {
        const conditions = searchTerms.map(() =>
          'LOWER(question) LIKE ? OR LOWER(answer) LIKE ?'
        ).join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, question, answer
          FROM faqs
          WHERE is_active = 1
          AND (${conditions})
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.faqs = r.results || [];
      } else if (intent === 'faq') {
        const r = await db.prepare(`
          SELECT slug, question, answer
          FROM faqs
          WHERE is_active = 1
          ORDER BY created_at DESC
          LIMIT ${MAX_RESULTS}
        `).all();
        results.faqs = r.results || [];
      }
    } catch (e) { console.error('Lummet retrieve faqs:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // AUTHORS
  // Schema: id, slug, name, bio, avatar_url, role, email, social_links,
  //   seo_title, seo_description, published, created_at, updated_at
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['authors', 'general'])) {
    try {
      if (searchTerms.length > 0) {
        const conditions = searchTerms.map(() =>
          'LOWER(name) LIKE ? OR LOWER(bio) LIKE ?'
        ).join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, name, bio, role
          FROM authors
          WHERE published = 1
          AND (${conditions})
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.authors = (r.results || []).map(a => ({
          ...a,
          bio: truncate(a.bio, 200)
        }));
      }
    } catch (e) { console.error('Lummet retrieve authors:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // COUNTRIES
  // Schema: code, name, currency, language, legal_status, seo_title, seo_description
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['geo', 'general']) && detectedCountry) {
    try {
      const r = await db.prepare(`
        SELECT code, name, currency, language, legal_status
        FROM countries
        WHERE code = ?
        LIMIT 1
      `).bind(detectedCountry.toUpperCase()).first();
      if (r) results.countries = [r];
    } catch (e) { console.error('Lummet retrieve countries:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // CATEGORIES
  // Schema: id, slug, name, description, seo_title, seo_description
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['casino_search', 'general']) && searchTerms.length > 0) {
    try {
      const conditions = searchTerms.map(() =>
        'LOWER(name) LIKE ? OR LOWER(description) LIKE ?'
      ).join(' OR ');
      const params = [];
      for (const term of searchTerms) {
        params.push(`%${term}%`, `%${term}%`);
      }
      const r = await db.prepare(`
        SELECT slug, name, description
        FROM categories
        WHERE (${conditions})
        LIMIT ${MAX_RESULTS}
      `).bind(...params).all();
      results.categories = r.results || [];
    } catch (e) { console.error('Lummet retrieve categories:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // SEO META (for context about pages)
  // Schema: id, page_type, page_slug, title, description, keywords,
  //   canonical, og_title, og_description, schema_json
  // ═══════════════════════════════════════════════════
  if (shouldSearch(intent, ['general', 'navigation']) && searchTerms.length > 0) {
    try {
      const conditions = searchTerms.map(() =>
        'LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(keywords) LIKE ?'
      ).join(' OR ');
      const params = [];
      for (const term of searchTerms) {
        params.push(`%${term}%`, `%${term}%`, `%${term}%`);
      }
      const r = await db.prepare(`
        SELECT page_type, page_slug, title, description
        FROM seo_meta
        WHERE (${conditions})
        LIMIT ${MAX_RESULTS}
      `).bind(...params).all();
      results.seoMeta = r.results || [];
    } catch (e) { console.error('Lummet retrieve seo_meta:', e.message); }
  }

  return results;
}

/**
 * Determine if a table should be searched based on intent
 */
function shouldSearch(intent, relevantIntents) {
  return relevantIntents.includes(intent) || intent === 'general';
}

/**
 * Evaluate geo status from geo_rules rows
 */
function evaluateGeoStatus(rules, country, casino) {
  if (!rules || rules.length === 0) {
    return evaluateGeoFromColumns(casino, country);
  }

  const countryRule = rules.find(r => r.country_code === country.toUpperCase());
  if (countryRule) return countryRule.status;

  const hasAllowed = rules.some(r => r.status === 'allowed');
  const hasBlocked = rules.some(r => r.status === 'blocked');

  if (hasAllowed && !hasBlocked) return 'blocked';
  if (hasBlocked && !hasAllowed) return 'allowed';

  return evaluateGeoFromColumns(casino, country);
}

/**
 * Evaluate geo from casino's supported_countries / restricted_countries columns
 */
function evaluateGeoFromColumns(casino, country) {
  if (!casino || !country) return 'unknown';

  const code = country.toUpperCase();
  const codeLower = country.toLowerCase();

  if (casino.restricted_countries) {
    const restricted = casino.restricted_countries.toLowerCase();
    if (restricted.includes(codeLower) || restricted.includes(code)) {
      return 'blocked';
    }
  }

  if (casino.supported_countries) {
    const supported = casino.supported_countries.toLowerCase();
    if (supported === '' || supported === '[]' || supported === 'null') return 'unknown';
    if (supported.includes(codeLower) || supported.includes(code)) {
      return 'allowed';
    }
    if (supported.length > 2) return 'blocked';
  }

  return 'unknown';
}

/**
 * Extract potential casino names from text (capitalized words)
 */
function extractCasinoNamesFromText(text) {
  if (!text) return [];
  const names = [];
  const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const commonWords = new Set([
    'The','What','How','Can','Are','Is','Do','Does','Which','Show','List',
    'Find','Tell','Give','Best','Top','All','About','Compare','Level',
    'Lummet','AI','Hello','Hi','Hey','Casino','Casinos','Review','Reviews',
    'Canada','Germany','France','Italy','Spain','Rwanda','Japan','China',
    'Brazil','Mexico','America','Africa','Nigeria','Kenya','Egypt','Sweden',
    'Norway','Denmark','Finland','Poland','Portugal','Greece','Turkey',
    'Russia','Ukraine','Korea','Thailand','Vietnam','Philippines','Indonesia',
    'Malaysia','Singapore','Argentina','Chile','Colombia','Peru','Austria',
    'Switzerland','Ireland','Belgium','Hungary','Romania','Bulgaria','Croatia',
    'Malta','Cyprus','Luxembourg','Iceland','Australia','England','Britain',
    'Holland','India','United','States','Kingdom','Arab','Emirates','Saudi',
    'South','New','Zealand','Czech','Republic','Dominican','Puerto','Rico',
    'Costa','Rica','Sri','Lanka','El','Salvador','Sierra','Leone','Bitcoin',
    'Ethereum','Crypto'
  ]);
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (!commonWords.has(name) && name.length > 2) {
      names.push(name.toLowerCase());
    }
  }
  return names;
}

/**
 * Build context string from retrieved results for the LLM prompt
 */
export function buildContextString(results, country) {
  const parts = [];

  if (results.casinos && results.casinos.length > 0) {
    parts.push('=== CASINOS ===');
    for (const c of results.casinos) {
      const geo = results.geoStatuses[c.slug] || 'unknown';
      const geoLabel = geo === 'allowed' ? 'Available' : geo === 'blocked' ? 'Not available' : 'Unknown';
      let line = `Name: ${c.name} | Slug: ${c.slug} | Rating: ${c.rating || 'N/A'}/5`;
      if (c.bonus_title) line += ` | Bonus: ${c.bonus_title}`;
      if (c.bonus_value) line += ` (${c.bonus_value})`;
      if (c.license) line += ` | License: ${c.license}`;
      if (c.owner) line += ` | Owner: ${c.owner}`;
      line += ` | ${geoLabel} in ${country || 'user country'}`;
      line += ` | Link: https://level.casino/en/casino/${c.slug}`;

      if (c.parsedFeatures && c.parsedFeatures.length > 0) {
        line += ` | Features: ${c.parsedFeatures.join(', ')}`;
      }

      if (results.casinoCategories && results.casinoCategories[c.slug]) {
        line += ` | Categories: ${results.casinoCategories[c.slug].map(cat => cat.name).join(', ')}`;
      }

      parts.push(line);
    }
  }

  if (results.reviews && results.reviews.length > 0) {
    parts.push('\n=== REVIEWS ===');
    for (const r of results.reviews) {
      let line = `Title: ${r.title} | Rating: ${r.rating || 'N/A'}/5 | Casino: ${r.casino_slug || 'N/A'}`;
      if (r.overview) line += ` | Overview: ${r.overview}`;
      if (r.pros) line += ` | Pros: ${r.pros}`;
      if (r.cons) line += ` | Cons: ${r.cons}`;
      if (r.verdict) line += ` | Verdict: ${r.verdict}`;
      if (r.author) line += ` | Author: ${r.author}`;
      if (r.games) line += ` | Games: ${r.games}`;
      if (r.bonuses) line += ` | Bonuses: ${r.bonuses}`;
      if (r.payments) line += ` | Payments: ${r.payments}`;
      if (r.licenses) line += ` | Licenses: ${r.licenses}`;
      line += ` | Link: https://level.casino/en/review/${r.slug}`;
      if (r.faqs && r.faqs.length > 0) {
        line += ` | FAQ: ${r.faqs.map(f => `Q:${f.q || f.question} A:${f.a || f.answer}`).join('; ')}`;
      }
      parts.push(line);
    }
  }

  if (results.reviewBlocks && results.reviewBlocks.length > 0) {
    parts.push('\n=== REVIEW DETAILS ===');
    for (const b of results.reviewBlocks) {
      parts.push(`[${b.review_slug}] ${b.title}: ${b.content}`);
    }
  }

  if (results.news && results.news.length > 0) {
    parts.push('\n=== NEWS ===');
    for (const n of results.news) {
      let line = `Title: ${n.title}`;
      if (n.excerpt) line += ` | Excerpt: ${n.excerpt}`;
      if (n.author) line += ` | Author: ${n.author}`;
      if (n.published_at) line += ` | Date: ${n.published_at}`;
      line += ` | Link: https://level.casino/en/news/${n.slug}`;
      parts.push(line);
    }
  }

  if (results.pages && results.pages.length > 0) {
    parts.push('\n=== PAGES ===');
    for (const p of results.pages) {
      parts.push(`Title: ${p.title} | Type: ${p.type || 'page'} | Link: https://level.casino/en/${p.slug}`);
    }
  }

  if (results.faqs && results.faqs.length > 0) {
    parts.push('\n=== FAQs ===');
    for (const f of results.faqs) {
      parts.push(`Q: ${f.question} | A: ${f.answer}`);
    }
  }

  if (results.authors && results.authors.length > 0) {
    parts.push('\n=== AUTHORS ===');
    for (const a of results.authors) {
      parts.push(`Name: ${a.name} | Role: ${a.role || 'Editor'} | Bio: ${a.bio || ''} | Profile: https://level.casino/en/author/${a.slug}`);
    }
  }

  if (results.countries && results.countries.length > 0) {
    parts.push('\n=== COUNTRY INFO ===');
    for (const c of results.countries) {
      parts.push(`Country: ${c.name} (${c.code}) | Currency: ${c.currency || 'N/A'} | Language: ${c.language || 'N/A'} | Legal Status: ${c.legal_status || 'N/A'}`);
    }
  }

  if (results.categories && results.categories.length > 0) {
    parts.push('\n=== CATEGORIES ===');
    for (const c of results.categories) {
      parts.push(`Category: ${c.name} | Link: https://level.casino/en/category/${c.slug}`);
    }
  }

  if (results.seoMeta && results.seoMeta.length > 0) {
    parts.push('\n=== SITE INFO ===');
    for (const s of results.seoMeta) {
      parts.push(`Page: ${s.title} | Type: ${s.page_type} | Slug: ${s.page_slug} | Description: ${s.description || ''}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No relevant information found in the Level.casino database.';
}
