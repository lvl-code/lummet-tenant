// =====================================================
// LUMMET AI — Database Retrieval (RAG Layer)
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
 */
export async function retrieve(env, query, country, intent, entities, conversationHistory) {
  const db = env.DB;
  const text = query.toLowerCase().trim();
  const q = `%${text}%`;
  const results = {
    casinos: [],
    reviews: [],
    news: [],
    pages: [],
    faqs: [],
    authors: [],
    countries: [],
    categories: [],
    geoStatuses: {}
  };

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
  if (shouldSearch(intent, ['casino_search', 'casino_review', 'casino_compare', 'bonuses', 'crypto', 'payments', 'geo', 'general'])) {
    try {
      if (text.includes('list') || text.includes('all casinos') || text.includes('available casinos') || text.includes('top casinos') || text.includes('best casinos')) {
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, website_url, logo, license, owner
          FROM casinos WHERE published = 1 AND status = 'published'
          ORDER BY featured DESC, rating DESC LIMIT 20
        `).all();
        results.casinos = r.results || [];
      } else {
        const conditions = searchTerms.map(() => 'LOWER(name) LIKE ? OR LOWER(bonus_title) LIKE ?').join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, website_url, logo, license, owner
          FROM casinos WHERE published = 1 AND status = 'published'
          AND (${conditions})
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.casinos = r.results || [];
      }

      if (results.casinos.length > 0 && country) {
        const slugs = results.casinos.map(c => c.slug);
        const placeholders = slugs.map(() => '?').join(',');
        const geoR = await db.prepare(`
          SELECT casino_slug, country_code, status FROM geo_rules
          WHERE casino_slug IN (${placeholders})
        `).bind(...slugs).all();

        const rulesByCasino = {};
        for (const row of (geoR.results || [])) {
          if (!rulesByCasino[row.casino_slug]) rulesByCasino[row.casino_slug] = [];
          rulesByCasino[row.casino_slug].push(row);
        }

        for (const casino of results.casinos) {
          const rules = rulesByCasino[casino.slug] || [];
          results.geoStatuses[casino.slug] = evaluateGeoStatus(rules, country);
        }
      }
    } catch (e) { console.error('Lummet retrieve casinos:', e.message); }
  }

  // ── REVIEWS ──
  if (shouldSearch(intent, ['casino_review', 'casino_compare', 'general'])) {
    try {
      if (text.includes('all reviews') || intent === 'casino_review') {
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, rating, overview, pros, cons
          FROM reviews WHERE published = 1
          ORDER BY created_at DESC LIMIT 20
        `).all();
        results.reviews = (r.results || []).map(rv => ({
          ...rv,
          overview: truncate(rv.overview, 300)
        }));
      } else {
        const conditions = searchTerms.map(() => 'LOWER(title) LIKE ? OR LOWER(overview) LIKE ?').join(' OR ');
        const params = [];
        for (const term of searchTerms) {
          params.push(`%${term}%`, `%${term}%`);
        }
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, rating, overview, pros, cons
          FROM reviews WHERE published = 1
          AND (${conditions})
          LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.reviews = (r.results || []).map(rv => ({
          ...rv,
          overview: truncate(rv.overview, 300)
        }));
      }
    } catch (e) { console.error('Lummet retrieve reviews:', e.message); }
  }

  // ── NEWS ──
  if (shouldSearch(intent, ['news', 'general'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, title, excerpt
        FROM news WHERE published = 1
        AND (LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ?)
        ORDER BY created_at DESC LIMIT ${MAX_RESULTS}
      `).bind(q, q).all();
      results.news = (r.results || []).map(n => ({
        ...n,
        excerpt: truncate(n.excerpt, 200)
      }));
    } catch (e) { console.error('Lummet retrieve news:', e.message); }
  }

  // ── PAGES ──
  if (shouldSearch(intent, ['general', 'educational', 'responsible_gambling', 'navigation'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, title
        FROM pages WHERE published = 1
        AND LOWER(title) LIKE ?
        LIMIT ${MAX_RESULTS}
      `).bind(q).all();
      results.pages = r.results || [];
    } catch (e) { console.error('Lummet retrieve pages:', e.message); }
  }

  // ── FAQs ──
  if (shouldSearch(intent, ['faq', 'general', 'educational', 'responsible_gambling'])) {
    try {
      const r = await db.prepare(`
        SELECT question, answer FROM faqs
        WHERE published = 1
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
  if (shouldSearch(intent, ['authors', 'general'])) {
    try {
      const r = await db.prepare(`
        SELECT slug, name, bio, role
        FROM authors WHERE published = 1
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

  return results;
}

function shouldSearch(intent, relevantIntents) {
  return relevantIntents.includes(intent) || intent === 'general';
}

function evaluateGeoStatus(rules, country) {
  if (!rules || rules.length === 0) return 'blocked';
  const countryRule = rules.find(r => r.country_code === country);
  if (countryRule) return countryRule.status;
  const hasAllowed = rules.some(r => r.status === 'allowed');
  const hasBlocked = rules.some(r => r.status === 'blocked');
  if (hasAllowed && !hasBlocked) return 'blocked';
  if (hasBlocked && !hasAllowed) return 'allowed';
  return 'blocked';
}

function extractCasinoNamesFromText(text) {
  if (!text) return [];
  const names = [];
  const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const commonWords = new Set(['The', 'What', 'How', 'Can', 'Are', 'Is', 'Do', 'Does', 'Which', 'Show', 'List', 'Find', 'Tell', 'Give', 'Best', 'Top', 'All', 'About', 'Compare', 'Level', 'Lummet', 'AI', 'Hello', 'Hi', 'Hey']);
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

  if (results.casinos.length > 0) {
    parts.push('=== CASINOS ===');
    for (const c of results.casinos) {
      const geo = results.geoStatuses[c.slug] || 'unknown';
      parts.push(`Name: ${c.name} | Slug: ${c.slug} | Rating: ${c.rating || 'N/A'}/5 | Bonus: ${c.bonus_title || 'N/A'} ${c.bonus_value || ''} | License: ${c.license || 'N/A'} | Available in ${country || 'unknown'}: ${geo} | Review link: https://level.casino/en/casino/${c.slug}`);
    }
  }

  if (results.reviews.length > 0) {
    parts.push('\n=== REVIEWS ===');
    for (const r of results.reviews) {
      parts.push(`Title: ${r.title} | Rating: ${r.rating || 'N/A'}/5 | Casino: ${r.casino_slug || 'N/A'} | Overview: ${r.overview || 'N/A'} | Review link: https://level.casino/en/review/${r.slug}`);
    }
  }

  if (results.news.length > 0) {
    parts.push('\n=== NEWS ===');
    for (const n of results.news) {
      parts.push(`Title: ${n.title} | Excerpt: ${n.excerpt || ''} | Link: https://level.casino/en/news/${n.slug}`);
    }
  }

  if (results.pages.length > 0) {
    parts.push('\n=== PAGES ===');
    for (const p of results.pages) {
      parts.push(`Title: ${p.title} | Link: https://level.casino/en/${p.slug}`);
    }
  }

  if (results.faqs.length > 0) {
    parts.push('\n=== FAQs ===');
    for (const f of results.faqs) {
      parts.push(`Q: ${f.question} | A: ${f.answer}`);
    }
  }

  if (results.authors.length > 0) {
    parts.push('\n=== AUTHORS ===');
    for (const a of results.authors) {
      parts.push(`Name: ${a.name} | Role: ${a.role || 'Editor'} | Bio: ${a.bio || ''} | Profile: https://level.casino/en/author/${a.slug}`);
    }
  }

  if (results.countries.length > 0) {
    parts.push('\n=== COUNTRY INFO ===');
    for (const c of results.countries) {
      parts.push(`Country: ${c.name} (${c.code}) | Currency: ${c.currency || 'N/A'} | Language: ${c.language || 'N/A'} | Legal Status: ${c.legal_status || 'N/A'}`);
    }
  }

  if (results.categories.length > 0) {
    parts.push('\n=== CATEGORIES ===');
    for (const c of results.categories) {
      parts.push(`Category: ${c.name} | Link: https://level.casino/en/category/${c.slug}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No relevant information found in the Level.casino database.';
}
