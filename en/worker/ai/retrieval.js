// =====================================================
// LUMMET AI — Database Retrieval (RAG Layer)
// Schema-matched to Level.casino D1 production tables
// =====================================================

const MAX_RESULTS = 5;
const MAX_CONTENT_LENGTH = 500;

function truncate(text, max = MAX_CONTENT_LENGTH) {
  if (!text) return '';
  const clean = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.substring(0, max) + '...' : clean;
}

/**
 * Main retrieval function — searches across all relevant tables
 * Matches exact schema of Level.casino D1 database
 */
export async function retrieve(env, query, country, intent, entities, conversationHistory) {
  const db = env.DB;
  const text = query.toLowerCase().trim();
  const q = `%${text}%`;
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
    casinoFeatures: {}
  };

  // Build search terms from message + entities + conversation history
  let searchTerms = [text];
  if (entities.casinoNames.length > 0) {
    searchTerms = entities.casinoNames.map(n => n.toLowerCase());
  } else if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory.slice(-4)) {
      const historyEntities = extractCasinoNamesFromText(msg.content);
      if (historyEntities.length > 0) {
        searchTerms = [...searchTerms, ...historyEntities];
      }
    }
  }

  // ── CASINOS ──
  // Schema: id, slug, name, logo, website_url, affiliate_url, rating, bonus_title,
  //         bonus_value, license, owner, features, supported_countries,
  //         restricted_countries, seo_title, seo_description, published, featured,
  //         sort_order, status
  if (shouldSearch(intent, ['casino_search', 'casino_review', 'casino_compare', 'bonuses', 'crypto', 'payments', 'geo', 'general'])) {
    try {
      if (text.includes('list') || text.includes('all casinos') || text.includes('available casinos') || text.includes('top casinos') || text.includes('best casinos')) {
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                 features, supported_countries, restricted_countries, featured
          FROM casinos
          WHERE published = 1
          ORDER BY featured DESC, rating DESC, sort_order ASC
          LIMIT 20
        `).all();
        results.casinos = r.results || [];
      } else {
        const conditions = searchTerms.map(() => 'LOWER(name) LIKE ? OR LOWER(bonus_title) LIKE ? OR LOWER(slug) LIKE ?').join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`, `%${term}%`);
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

      // Parse features for each casino
      for (const casino of results.casinos) {
        try {
          casino.parsedFeatures = casino.features ? JSON.parse(casino.features) : [];
        } catch {
          casino.parsedFeatures = casino.features ? casino.features.split(',').map(f => f.trim()) : [];
        }
        try {
          casino.parsedSupported = casino.supported_countries ? (typeof casino.supported_countries === 'string' ? JSON.parse(casino.supported_countries) : casino.supported_countries) : [];
        } catch {
          casino.parsedSupported = casino.supported_countries ? casino.supported_countries.split(',').map(c => c.trim()) : [];
        }
        try {
          casino.parsedRestricted = casino.restricted_countries ? (typeof casino.restricted_countries === 'string' ? JSON.parse(casino.restricted_countries) : casino.restricted_countries) : [];
        } catch {
          casino.parsedRestricted = casino.restricted_countries ? casino.restricted_countries.split(',').map(c => c.trim()) : [];
        }
      }

      // Get geo statuses for found casinos
      if (results.casinos.length > 0 && country) {
        const slugs = results.casinos.map(c => c.slug);
        const placeholders = slugs.map(() => '?').join(',');
        const geoR = await db.prepare(`
          SELECT casino_slug, country_code, status, bonus_override, priority, redirect_url
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
          const rules = rulesByCasino[casino.slug] || [];
          results.geoStatuses[casino.slug] = evaluateGeoStatus(rules, country, casino);
        }
      }
    } catch (e) { console.error('Lummet retrieve casinos:', e.message); }
  }

  // ── REVIEWS ──
  // Schema: id, casino_slug, country_code, slug, title, content, pros, cons, rating,
  //         seo_title, seo_description, ai_generated, published, overview, games,
  //         bonuses, payments, licenses, faq_json, verdict, author, author_title,
  //         reviewed_at, author_id
  if (shouldSearch(intent, ['casino_review', 'casino_compare', 'general'])) {
    try {
      if (text.includes('all reviews') || (intent === 'casino_review' && searchTerms.length === 1)) {
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, country_code, rating, overview, pros, cons,
                 verdict, author, author_title
          FROM reviews
          WHERE published = 1
          ORDER BY created_at DESC LIMIT 20
        `).all();
        results.reviews = (r.results || []).map(rv => ({
          ...rv,
          overview: truncate(rv.overview, 300),
          pros: rv.pros,
          cons: rv.cons,
          verdict: truncate(rv.verdict, 200)
        }));
      } else {
        // Search by casino name (mapped to casino_slug) or review title
        const conditions = searchTerms.map(() => 'LOWER(title) LIKE ? OR LOWER(casino_slug) LIKE ? OR LOWER(overview) LIKE ?').join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, country_code, rating, overview, pros, cons,
                 verdict, author, author_title, games, bonuses, payments, licenses
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

      // Get review blocks for detailed sections
      if (results.reviews.length > 0 && intent === 'casino_review') {
        const reviewSlugs = results.reviews.map(r => r.slug);
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

      // Parse faq_json for reviews that have it
      for (const review of results.reviews) {
        try {
          const faqR = await db.prepare(`
            SELECT faq_json FROM reviews WHERE slug = ?
          `).bind(review.slug).first();
          if (faqR?.faq_json) {
            review.faqs = JSON.parse(faqR.faq_json);
          }
        } catch {}
      }
    } catch (e) { console.error('Lummet retrieve reviews:', e.message); }
  }

  // ── NEWS ──
  // Schema: id, slug, title, content, author, ai_generated, seo_title, seo_description,
  //         published, excerpt, tags, author_id, published_at, featured_image
  if (shouldSearch(intent, ['news', 'general'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, title, excerpt, tags, author, published_at
        FROM news
        WHERE published = 1
        AND (LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(tags) LIKE ?)
        ORDER BY published_at DESC, created_at DESC
        LIMIT ${MAX_RESULTS}
      `).bind(q, q, q).all();
      results.news = (r.results || []).map(n => ({
        ...n,
        excerpt: truncate(n.excerpt, 200)
      }));
    } catch (e) { console.error('Lummet retrieve news:', e.message); }
  }

  // ── PAGES ──
  // Schema: id, slug, type, template, title, content_json, seo_title, seo_description,
  //         ai_generated, published, author_id
  if (shouldSearch(intent, ['general', 'educational', 'responsible_gambling', 'navigation'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, type, template, title
        FROM pages
        WHERE published = 1
        AND (LOWER(title) LIKE ? OR LOWER(slug) LIKE ?)
        LIMIT ${MAX_RESULTS}
      `).bind(q, q).all();
      results.pages = r.results || [];
    } catch (e) { console.error('Lummet retrieve pages:', e.message); }
  }

  // ── FAQs ──
  // Schema: id, slug, question, answer, is_active, created_at, updated_at
  // NOTE: uses is_active NOT published
  if (shouldSearch(intent, ['faq', 'general', 'educational', 'responsible_gambling'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, question, answer
        FROM faqs
        WHERE is_active = 1
        AND (LOWER(question) LIKE ? OR LOWER(answer) LIKE ?)
        LIMIT ${MAX_RESULTS}
      `).bind(q, q).all();
      results.faqs = (r.results || []).map(f => ({
        question: f.question,
        answer: truncate(f.answer, 300)
      }));
    } catch (e) { console.error('Lummet retrieve faqs:', e.message); }
  }

  // ── AUTHORS ──
  // Schema: id, slug, name, bio, avatar_url, role, email, social_links,
  //         seo_title, seo_description, published
  if (shouldSearch(intent, ['authors', 'general'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, name, bio, role
        FROM authors
        WHERE published = 1
        AND (LOWER(name) LIKE ? OR LOWER(bio) LIKE ?)
        LIMIT ${MAX_RESULTS}
      `).bind(q, q).all();
      results.authors = (r.results || []).map(a => ({
        ...a,
        bio: truncate(a.bio, 200)
      }));
    } catch (e) { console.error('Lummet retrieve authors:', e.message); }
  }

  // ── COUNTRIES ──
  // Schema: code, name, currency, language, legal_status, seo_title, seo_description
  if (shouldSearch(intent, ['geo', 'general'])) {
    try {
      if (country) {
        const r = await db.prepare(`
          SELECT code, name, currency, language, legal_status
          FROM countries WHERE code = ?
          LIMIT 1
        `).bind(country.toUpperCase()).first();
        if (r) results.countries = [r];
      }
    } catch (e) { console.error('Lummet retrieve countries:', e.message); }
  }

  // ── CATEGORIES ──
  // Schema: id, slug, name, description, seo_title, seo_description
  // casino_categories: casino_id, category_id (junction with integer IDs)
  if (shouldSearch(intent, ['casino_search', 'general'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, name, description
        FROM categories
        WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ?
        LIMIT ${MAX_RESULTS}
      `).bind(q, q).all();
      results.categories = r.results || [];
    } catch (e) { console.error('Lummet retrieve categories:', e.message); }
  }

  // ── SEO META ──
  // Schema: id, page_type, page_slug, title, description, keywords, canonical,
  //         og_image, schema_json, robots
  if (shouldSearch(intent, ['general', 'navigation'])) {
    try {
      const r = await db.prepare(`
        SELECT page_type, page_slug, title, description
        FROM seo_meta
        WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(keywords) LIKE ?
        LIMIT ${MAX_RESULTS}
      `).bind(q, q, q).all();
      results.seoMeta = r.results || [];
    } catch (e) { console.error('Lummet retrieve seo_meta:', e.message); }
  }

  return results;
}

function shouldSearch(intent, relevantIntents) {
  return relevantIntents.includes(intent) || intent === 'general';
}

/**
 * Evaluate geo status for a casino given its rules and user country
 * Falls back to supported_countries / restricted_countries on the casino record
 */
function evaluateGeoStatus(rules, country, casino) {
  const countryUpper = country.toUpperCase();

  // 1. Check geo_rules first (highest priority)
  if (rules && rules.length > 0) {
    const countryRule = rules.find(r => r.country_code === countryUpper);
    if (countryRule) return countryRule.status;
    // If there are rules but none for this country, check if there's a blanket rule
    const blanketAllowed = rules.find(r => r.status === 'allowed' && r.country_code === '*');
    if (blanketAllowed) return 'allowed';
    const blanketBlocked = rules.find(r => r.status === 'blocked' && r.country_code === '*');
    if (blanketBlocked) return 'blocked';
  }

  // 2. Fall back to casino's supported_countries / restricted_countries fields
  if (casino) {
    const supported = casino.parsedSupported || [];
    const restricted = casino.parsedRestricted || [];

    if (supported.length > 0) {
      if (supported.includes(countryUpper) || supported.includes(country)) {
        return 'allowed';
      }
      return 'blocked';
    }

    if (restricted.length > 0) {
      if (restricted.includes(countryUpper) || restricted.includes(country)) {
        return 'blocked';
      }
      return 'allowed';
    }
  }

  // 3. No data — unknown
  return 'unknown';
}

function extractCasinoNamesFromText(text) {
  if (!text) return [];
  const names = [];
  const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const commonWords = new Set([
    'The', 'What', 'How', 'Can', 'Are', 'Is', 'Do', 'Does', 'Which', 'Show',
    'List', 'Find', 'Tell', 'Give', 'Best', 'Top', 'All', 'About', 'Compare',
    'Level', 'Lummet', 'AI', 'Hello', 'Hi', 'Hey', 'Tell', 'Me', 'Casino',
    'Casinos', 'Review', 'Reviews', 'Bonus', 'Bonuses'
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
 * Matches exact schema fields
 */
export function buildContextString(results, country) {
  const parts = [];
  const countryUpper = country ? country.toUpperCase() : 'UNKNOWN';

  // ── CASINOS ──
  if (results.casinos.length > 0) {
    parts.push('=== CASINOS ===');
    for (const c of results.casinos) {
      const geo = results.geoStatuses[c.slug] || 'unknown';
      const features = c.parsedFeatures || [];
      const featuresStr = features.length > 0 ? features.join(', ') : 'N/A';

      parts.push(
        `Name: ${c.name}\n` +
        `Slug: ${c.slug}\n` +
        `Rating: ${c.rating || 'N/A'}/5\n` +
        `Bonus: ${c.bonus_title || 'N/A'} ${c.bonus_value || ''}\n` +
        `License: ${c.license || 'N/A'}\n` +
        `Owner: ${c.owner || 'N/A'}\n` +
        `Features: ${featuresStr}\n` +
        `Available in ${countryUpper}: ${geo}\n` +
        `Link: https://level.casino/en/casino/${c.slug}`
      );
    }
  }

  // ── REVIEWS ──
  if (results.reviews.length > 0) {
    parts.push('\n=== REVIEWS ===');
    for (const r of results.reviews) {
      const reviewParts = [
        `Title: ${r.title}`,
        `Slug: ${r.slug}`,
        `Casino: ${r.casino_slug || 'N/A'}`,
        `Rating: ${r.rating || 'N/A'}/5`,
        `Author: ${r.author || 'N/A'}${r.author_title ? ' (' + r.author_title + ')' : ''}`
      ];

      if (r.overview) reviewParts.push(`Overview: ${r.overview}`);
      if (r.games) reviewParts.push(`Games: ${r.games}`);
      if (r.bonuses) reviewParts.push(`Bonuses: ${r.bonuses}`);
      if (r.payments) reviewParts.push(`Payments: ${r.payments}`);
      if (r.licenses) reviewParts.push(`Licensing: ${r.licenses}`);
      if (r.pros) reviewParts.push(`Pros: ${r.pros}`);
      if (r.cons) reviewParts.push(`Cons: ${r.cons}`);
      if (r.verdict) reviewParts.push(`Verdict: ${r.verdict}`);
      if (r.faqs && Array.isArray(r.faqs) && r.faqs.length > 0) {
        const faqStr = r.faqs.map(f => `Q: ${f.q || f.question} A: ${f.a || f.answer}`).join(' | ');
        reviewParts.push(`FAQ: ${faqStr}`);
      }

      reviewParts.push(`Review link: https://level.casino/en/review/${r.slug}`);

      parts.push(reviewParts.join('\n'));
    }
  }

  // ── REVIEW BLOCKS ──
  if (results.reviewBlocks && results.reviewBlocks.length > 0) {
    parts.push('\n=== REVIEW DETAILS ===');
    for (const b of results.reviewBlocks) {
      parts.push(`Review: ${b.review_slug} | Section: ${b.title} | Content: ${b.content}`);
    }
  }

  // ── NEWS ──
  if (results.news.length > 0) {
    parts.push('\n=== NEWS ===');
    for (const n of results.news) {
      const dateStr = n.published_at || '';
      parts.push(
        `Title: ${n.title}\n` +
        `Excerpt: ${n.excerpt || ''}\n` +
        `Tags: ${n.tags || ''}\n` +
        `Author: ${n.author || ''}\n` +
        `Date: ${dateStr}\n` +
        `Link: https://level.casino/en/news/${n.slug}`
      );
    }
  }

  // ── PAGES ──
  if (results.pages.length > 0) {
    parts.push('\n=== PAGES ===');
    for (const p of results.pages) {
      parts.push(`Title: ${p.title} | Type: ${p.type} | Link: https://level.casino/en/${p.slug}`);
    }
  }

  // ── FAQs ──
  if (results.faqs.length > 0) {
    parts.push('\n=== FAQs ===');
    for (const f of results.faqs) {
      parts.push(`Q: ${f.question}\nA: ${f.answer}`);
    }
  }

  // ── AUTHORS ──
  if (results.authors.length > 0) {
    parts.push('\n=== AUTHORS ===');
    for (const a of results.authors) {
      parts.push(`Name: ${a.name} | Role: ${a.role || 'Editor'} | Bio: ${a.bio || ''} | Profile: https://level.casino/en/author/${a.slug}`);
    }
  }

  // ── COUNTRY INFO ──
  if (results.countries.length > 0) {
    parts.push('\n=== COUNTRY INFO ===');
    for (const c of results.countries) {
      parts.push(`Country: ${c.name} (${c.code}) | Currency: ${c.currency || 'N/A'} | Language: ${c.language || 'N/A'} | Legal Status: ${c.legal_status || 'N/A'}`);
    }
  }

  // ── CATEGORIES ──
  if (results.categories.length > 0) {
    parts.push('\n=== CATEGORIES ===');
    for (const c of results.categories) {
      parts.push(`Category: ${c.name} | Description: ${truncate(c.description, 150)} | Link: https://level.casino/en/category/${c.slug}`);
    }
  }

  // ── SEO META ──
  if (results.seoMeta && results.seoMeta.length > 0) {
    parts.push('\n=== SEO PAGES ===');
    for (const s of results.seoMeta) {
      parts.push(`Page: ${s.title} | Type: ${s.page_type} | Slug: ${s.page_slug} | Description: ${truncate(s.description, 150)}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No relevant information found in the Level.casino database.';
}
