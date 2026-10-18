import { getSiteContext } from "../../site-context.js";
import { MAX_RESULTS, fuzzyFindCasinoSlug, normalizeForMatch, truncate } from "./match-helpers.js";
import { evaluateGeoFromColumns, evaluateGeoStatus, extractCountryFromMessage, extractSearchTerms, isGeoText, isListingText, shouldSearchTable } from "./search-helpers.js";

/**
 * Main retrieval function — uses LLM plan if available, falls back to keyword extraction
 */
export async function retrieve(env, query, country, plan = null, conversationHistory = null, request = null ) {
  const db = env.DB;
  const site = await getSiteContext(request, env);
  const text = query.toLowerCase().trim();

  // ── Determine search parameters from plan or fallback ──
  const searchTerms = plan?.search_terms?.length > 0
    ? plan.search_terms
    : extractSearchTerms(query);

  const casinoNames = plan?.casino_names || [];
  const allSearchTerms = [...new Set([
    ...searchTerms,
    ...casinoNames.map(n => n.toLowerCase())
  ])].filter(t => t.length > 0);

  // Deterministic text extraction takes priority over the model's own
  // country_code guess: if the message unambiguously names a country
  // ("...in Kenya?"), a keyword match on that exact text is more
  // trustworthy than an LLM classification that can (and did, in
  // testing) return the wrong country entirely. Falls back to the
  // model's guess only when the text itself has no clear match (e.g.
  // "can I play from Nairobi" -- no literal country name to match).
  const detectedCountry = extractCountryFromMessage(query) || plan?.country_code || country;
  const intent = plan?.intent || 'general';
  const isListing = plan?.is_listing || isListingText(text);
  const isGeo = plan?.intent === 'geo' || plan?.intent === 'licensing' || isGeoText(text);
  const isComparison = plan?.is_comparison || false;
  const tablesToSearch = plan?.tables || [];

  const results = {
    casinos: [], reviews: [], reviewBlocks: [], news: [], platformUpdates: [],
    pages: [], faqs: [], authors: [], countries: [],
    categories: [], seoMeta: [], geoStatuses: {}, casinoCategories: {},
    paymentMethods: [], casinoPaymentMethods: {}, navItems: [], homepageSections: [],
    seoPages: [], contentItems: [], researchItems: []
  };

  // ═══════════════════════════════════════════════════
  // CASINOS
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('casinos', tablesToSearch, intent, ['casino_search','casino_review','casino_compare','bonuses','crypto','payments','geo','licensing','general'])) {
    try {
      if (isGeo && detectedCountry) {
        // ── Geo search: find casinos available in a specific country ──
        const geoR = await db.prepare(`
          SELECT gr.casino_slug, gr.status, gr.bonus_override,
                 c.slug, c.name, c.rating, c.bonus_title, c.bonus_value,
                 c.license, c.owner, c.features
          FROM geo_rules gr
          JOIN casinos c ON c.slug = gr.casino_slug
          WHERE gr.country_code = ? AND gr.status = 'allowed' AND c.published = 1
          ORDER BY c.featured DESC, c.rating DESC LIMIT 20
        `).bind(detectedCountry.toUpperCase()).all();

        if (geoR.results && geoR.results.length > 0) {
          results.casinos = geoR.results.map(c => ({
            slug: c.slug || c.casino_slug, name: c.name, rating: c.rating,
            bonus_title: c.bonus_override || c.bonus_title, bonus_value: c.bonus_value,
            license: c.license, owner: c.owner, features: c.features
          }));
          for (const c of results.casinos) results.geoStatuses[c.slug] = 'allowed';
        } else {
          // Fallback: check supported_countries column
          const supportedR = await db.prepare(`
            SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                   features, supported_countries, restricted_countries
            FROM casinos WHERE published = 1
            AND (LOWER(supported_countries) LIKE ? OR LOWER(supported_countries) LIKE ?)
            AND LOWER(restricted_countries) NOT LIKE ?
            ORDER BY featured DESC, rating DESC LIMIT 20
          `).bind(`%${detectedCountry.toLowerCase()}%`, `%"${detectedCountry.toUpperCase()}"%`, `%${detectedCountry.toLowerCase()}%`).all();

          if (supportedR.results && supportedR.results.length > 0) {
            results.casinos = supportedR.results;
            for (const c of results.casinos) results.geoStatuses[c.slug] = 'allowed';
          } else {
            // Last resort: all casinos, evaluate geo per casino
            const allR = await db.prepare(`
              SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                     features, supported_countries, restricted_countries, featured
              FROM casinos WHERE published = 1
              ORDER BY featured DESC, rating DESC, sort_order ASC LIMIT 20
            `).all();
            results.casinos = allR.results || [];
            for (const c of results.casinos) results.geoStatuses[c.slug] = evaluateGeoFromColumns(c, detectedCountry);
          }
        }
      } else if (isListing) {
        // ── Listing: return all published casinos ──
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                 features, supported_countries, restricted_countries, featured
          FROM casinos WHERE published = 1
          ORDER BY featured DESC, rating DESC, sort_order ASC LIMIT 20
        `).all();
        results.casinos = r.results || [];
      } else if (allSearchTerms.length > 0) {
        // ── Keyword search ──
        // Plain LIKE conditions plus a space/punctuation-normalized
        // variant of each: "Casa Bet" (typed with a space) would never
        // LIKE-match a stored "casabet" otherwise, since LIKE needs
        // that literal substring -- including the space -- present.
        const conditions = allSearchTerms.map(() =>
          'LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(bonus_title) LIKE ? OR LOWER(features) LIKE ? OR ' +
          "REPLACE(REPLACE(REPLACE(REPLACE(LOWER(name),' ',''),'-',''),'''',''),'.','') LIKE ?"
        ).join(' OR ');
        const params = [];
        for (const term of allSearchTerms) {
          params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${normalizeForMatch(term)}%`);
        }
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                 features, supported_countries, restricted_countries, featured
          FROM casinos WHERE published = 1 AND (${conditions}) LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.casinos = r.results || [];

        // Understand.js already tries to correct typos before this point,
        // and the normalized LIKE above catches spacing/punctuation --
        // this is the last-resort net for a genuine misspelling (an
        // extra, missing, or swapped letter) that survives both. Only
        // fires when the model believed a *specific casino* was named,
        // so an unrelated broad query never triggers a fuzzy scan.
        if (results.casinos.length === 0 && casinoNames.length > 0) {
          const fuzzySlug = await fuzzyFindCasinoSlug(db, casinoNames);
          if (fuzzySlug) {
            const fr = await db.prepare(`
              SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                     features, supported_countries, restricted_countries, featured
              FROM casinos WHERE published = 1 AND slug = ? LIMIT 1
            `).bind(fuzzySlug).first();
            if (fr) results.casinos = [fr];
          }
        }
      } else if (intent === 'casino_search' || intent === 'general') {
        // ── Fallback: top casinos ──
        const r = await db.prepare(`
          SELECT slug, name, rating, bonus_title, bonus_value, license, owner,
                 features, supported_countries, restricted_countries, featured
          FROM casinos WHERE published = 1
          ORDER BY featured DESC, rating DESC, sort_order ASC LIMIT 10
        `).all();
        results.casinos = r.results || [];
      }

      // Parse features
      for (const casino of results.casinos) {
        try { casino.parsedFeatures = casino.features ? JSON.parse(casino.features) : []; }
        catch { casino.parsedFeatures = casino.features ? casino.features.split(',').map(f => f.trim()).filter(Boolean) : []; }
      }

      // Get geo statuses from geo_rules
      if (results.casinos.length > 0 && detectedCountry) {
        const slugs = results.casinos.map(c => c.slug).filter(Boolean);
        if (slugs.length > 0) {
          const placeholders = slugs.map(() => '?').join(',');
          const geoR = await db.prepare(`
            SELECT casino_slug, country_code, status, priority
            FROM geo_rules WHERE casino_slug IN (${placeholders}) ORDER BY priority DESC
          `).bind(...slugs).all();
          const rulesByCasino = {};
          for (const row of (geoR.results || [])) {
            if (!rulesByCasino[row.casino_slug]) rulesByCasino[row.casino_slug] = [];
            rulesByCasino[row.casino_slug].push(row);
          }
          for (const casino of results.casinos) {
            if (!results.geoStatuses[casino.slug]) {
              results.geoStatuses[casino.slug] = evaluateGeoStatus(rulesByCasino[casino.slug] || [], detectedCountry, casino);
            }
          }
        }
      }

      // Get casino categories
      if (results.casinos.length > 0) {
        for (const casino of results.casinos) {
          try {
            const catR = await db.prepare(`
              SELECT c.slug, c.name FROM categories c
              JOIN casino_categories cc ON cc.category_id = c.id
              JOIN casinos cas ON cas.id = cc.casino_id WHERE cas.slug = ?
            `).bind(casino.slug).all();
            if (catR.results && catR.results.length > 0) results.casinoCategories[casino.slug] = catR.results;
          } catch {}
        }
      }

      // Get accepted payment methods per casino (joined via casino_payment_methods)
      // -- only when it's actually relevant, to avoid extra queries on every casino answer
      if (results.casinos.length > 0 && (intent === 'payments' || intent === 'crypto' || isListing)) {
        for (const casino of results.casinos) {
          try {
            const pmR = await db.prepare(`
              SELECT pm.slug, pm.name, pm.method_type FROM payment_methods pm
              JOIN casino_payment_methods cpm ON cpm.payment_method_id = pm.id
              JOIN casinos cas ON cas.id = cpm.casino_id
              WHERE cas.slug = ? AND pm.published = 1
              ORDER BY pm.sort_order ASC
            `).bind(casino.slug).all();
            if (pmR.results && pmR.results.length > 0) results.casinoPaymentMethods[casino.slug] = pmR.results;
          } catch {}
        }
      }
    } catch (e) { console.error('Lummet retrieve casinos:', e.message); }
  }

    // ═══════════════════════════════════════════════════
  // REVIEWS
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('reviews', tablesToSearch, intent, ['casino_review','casino_compare','general'])) {
    try {
      if (isListing && intent === 'casino_review') {
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, country_code, rating, overview,
                 pros, cons, verdict, author, author_title
          FROM reviews WHERE published = 1 ORDER BY created_at DESC LIMIT 20
        `).all();
        results.reviews = (r.results || []).map(rv => ({ ...rv, overview: truncate(rv.overview, 300), verdict: truncate(rv.verdict, 200) }));
      } else if (allSearchTerms.length > 0) {
        const conditions = allSearchTerms.map(() =>
          "LOWER(title) LIKE ? OR LOWER(casino_slug) LIKE ? OR LOWER(overview) LIKE ? OR REPLACE(REPLACE(LOWER(casino_slug),'-',''),'_','') LIKE ?"
        ).join(' OR ');
        const params = [];
        for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${normalizeForMatch(term)}%`);
        const r = await db.prepare(`
          SELECT slug, title, casino_slug, country_code, rating, overview, pros, cons,
                 verdict, author, author_title, games, bonuses, payments, licenses
          FROM reviews WHERE published = 1 AND (${conditions}) LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.reviews = (r.results || []).map(rv => ({
          ...rv, overview: truncate(rv.overview, 300), games: truncate(rv.games, 200),
          bonuses: truncate(rv.bonuses, 200), payments: truncate(rv.payments, 200),
          licenses: truncate(rv.licenses, 200), verdict: truncate(rv.verdict, 200)
        }));

        // Same typo/spacing last-resort as the CASINOS block above --
        // resolve the real casino slug fuzzily, then look up its review
        // by that exact, correct slug.
        if (results.reviews.length === 0 && casinoNames.length > 0) {
          const fuzzySlug = await fuzzyFindCasinoSlug(db, casinoNames);
          if (fuzzySlug) {
            const fr = await db.prepare(`
              SELECT slug, title, casino_slug, country_code, rating, overview, pros, cons,
                     verdict, author, author_title, games, bonuses, payments, licenses
              FROM reviews WHERE published = 1 AND casino_slug = ? LIMIT 1
            `).bind(fuzzySlug).first();
            if (fr) results.reviews = [{
              ...fr, overview: truncate(fr.overview, 300), games: truncate(fr.games, 200),
              bonuses: truncate(fr.bonuses, 200), payments: truncate(fr.payments, 200),
              licenses: truncate(fr.licenses, 200), verdict: truncate(fr.verdict, 200)
            }];
          }
        }
      }

      // Get review blocks
      if (results.reviews.length > 0 && (intent === 'casino_review' || intent === 'casino_compare')) {
        const reviewSlugs = results.reviews.map(r => r.slug).filter(Boolean);
        if (reviewSlugs.length > 0) {
          const placeholders = reviewSlugs.map(() => '?').join(',');
          const blocksR = await db.prepare(`
            SELECT review_slug, title, content, position FROM review_blocks
            WHERE review_slug IN (${placeholders}) ORDER BY position ASC
          `).bind(...reviewSlugs).all();
          results.reviewBlocks = (blocksR.results || []).map(b => ({ ...b, content: truncate(b.content, 300) }));
        }
      }

      // Parse faq_json
      for (const review of results.reviews) {
        try {
          const faqRow = await db.prepare(`SELECT faq_json FROM reviews WHERE slug = ?`).bind(review.slug).first();
          if (faqRow?.faq_json) review.faqs = JSON.parse(faqRow.faq_json);
        } catch {}
      }
    } catch (e) { console.error('Lummet retrieve reviews:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // NEWS
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('news', tablesToSearch, intent, ['news','general'])) {
    try {
      if (intent === 'news' || text.includes('news') || text.includes('latest')) {
        const r = await db.prepare(`
          SELECT slug, title, excerpt, tags, author, published_at FROM news
          WHERE published = 1 ORDER BY published_at DESC, created_at DESC LIMIT ${MAX_RESULTS}
        `).all();
        results.news = (r.results || []).map(n => ({ ...n, excerpt: truncate(n.excerpt, 200) }));
      } else if (allSearchTerms.length > 0) {
        const conditions = allSearchTerms.map(() => 'LOWER(title) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(tags) LIKE ?').join(' OR ');
        const params = [];
        for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`, `%${term}%`);
        const r = await db.prepare(`
          SELECT slug, title, excerpt, tags, author, published_at FROM news
          WHERE published = 1 AND (${conditions}) ORDER BY published_at DESC LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.news = (r.results || []).map(n => ({ ...n, excerpt: truncate(n.excerpt, 200) }));
      }
    } catch (e) { console.error('Lummet retrieve news:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // SPORTSBOOKS / AFFILIATE PARTNERS / CUSTOM CONTENT  (content_items)
  // Published items only, and only those the visitor's country may see
  // (same rules as the public listing pages: no rules = not shown).
  // ═══════════════════════════════════════════════════
  const wantsItems = /sportsbook|sports book|betting|bookmaker|\bodds\b|affiliate|partner/.test(text) || tablesToSearch.includes('content_items');
  const itemTerms = allSearchTerms.filter(t => t.length >= 3);
  if (wantsItems || itemTerms.length > 0) {
    try {
      const where = [];
      const params = [];
      for (const term of itemTerms) {
        where.push(`LOWER(ci.name) LIKE ? OR LOWER(ci.slug) LIKE ?`);
        params.push(`%${term}%`, `%${term}%`);
        if (wantsItems) { where.push(`LOWER(ci.title) LIKE ? OR LOWER(ci.description) LIKE ? OR LOWER(ci.excerpt) LIKE ?`); params.push(`%${term}%`, `%${term}%`, `%${term}%`); }
      }
      const typeFilter = /sportsbook|sports book|betting|bookmaker|\bodds\b/.test(text) ? `AND ci.content_type = 'sportsbook'` : (/affiliate|partner/.test(text) ? `AND ci.content_type = 'affiliate_partner'` : '');
      const cond = where.length ? `AND (${where.join(' OR ')})` : '';
      if (where.length || wantsItems) {
        const r = await db.prepare(`
          SELECT ci.id, ci.content_type, ci.custom_type_slug, ci.slug, ci.name, ci.title, ci.excerpt, ci.description, ci.rating, ci.license, ci.website
          FROM content_items ci
          WHERE ci.published = 1 AND ci.status = 'published' ${typeFilter} ${cond}
          ORDER BY ci.featured DESC, ci.rating DESC, ci.name ASC LIMIT ${MAX_RESULTS * 2}
        `).bind(...params).all();
        const rows = r.results || [];
        const byType = {};
        for (const row of rows) (byType[row.content_type] ||= []).push(row.id);
        const allowed = new Set();
        for (const [ct, ids] of Object.entries(byType)) {
          const ph = ids.map(() => '?').join(',');
          const g = await db.prepare(`SELECT content_id, country_code, status FROM content_geo WHERE content_type = ? AND content_id IN (${ph})`).bind(ct, ...ids).all();
          const rulesById = {};
          for (const x of (g.results || [])) (rulesById[x.content_id] ||= []).push(x);
          for (const id of ids) {
            const rules = rulesById[id] || [];
            if (!rules.length) continue; // no rules = not available
            const hit = rules.find(x => x.country_code === detectedCountry);
            const hasA = rules.some(x => x.status === 'allowed');
            const hasB = rules.some(x => x.status === 'blocked');
            const ok = hit ? hit.status === 'allowed' : (hasB && !hasA);
            if (ok) allowed.add(`${ct}:${id}`);
          }
        }
        results.contentItems = rows.filter(x => allowed.has(`${x.content_type}:${x.id}`)).slice(0, MAX_RESULTS).map(x => ({
          type: x.content_type, custom_type_slug: x.custom_type_slug, slug: x.slug, name: x.name,
          summary: truncate(x.excerpt || x.description || x.title || '', 240), rating: x.rating, license: x.license
        }));
      }
    } catch (e) { console.error('Lummet retrieve content items:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // RESEARCH (research_items) -- published, non-draft; only VERIFIED claims are quoted
  // ═══════════════════════════════════════════════════
  const wantsResearch = /research|report|regulator|regulation|regulatory|legislation|\blaw\b|legal|licen[cs]e|licen[cs]ing|compliance|\btax\b/.test(text) || tablesToSearch.includes('research_items') || intent === 'licensing';
  if (wantsResearch) {
    try {
      const where = [];
      const params = [];
      for (const term of itemTerms) {
        where.push(`LOWER(r.title) LIKE ? OR LOWER(r.subtitle) LIKE ? OR LOWER(r.excerpt) LIKE ? OR LOWER(c.name) LIKE ?`);
        params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
      }
      const cond = where.length ? `AND (${where.join(' OR ')})` : '';
      const r = await db.prepare(`
        SELECT r.id, r.type, r.slug, r.title, r.excerpt, r.last_verified_at, c.name AS country_name
        FROM research_items r LEFT JOIN countries c ON c.code = r.country_id
        WHERE r.published = 1 AND r.status != 'draft' ${cond}
        ORDER BY r.updated_at DESC LIMIT 5
      `).bind(...params).all();
      for (const row of (r.results || [])) {
        let claims = [];
        try {
          const cl = await db.prepare(`SELECT claim_text FROM research_claims WHERE research_item_id = ? AND status = 'verified' ORDER BY id LIMIT 3`).bind(row.id).all();
          claims = (cl.results || []).map(x => truncate(x.claim_text, 220));
        } catch (_) { /* claims table optional */ }
        results.researchItems.push({ type: row.type, slug: row.slug, title: row.title, excerpt: truncate(row.excerpt || '', 240), country: row.country_name || null, verified: row.last_verified_at || null, claims });
      }
    } catch (e) { console.error('Lummet retrieve research:', e.message); }
  }

  // ═══════════════════════════════════════════════════
// PLATFORM UPDATES
// ═══════════════════════════════════════════════════
if (
  shouldSearchTable(
    'platform_updates',
    tablesToSearch,
    intent,
    ['platform_update', 'updates', 'general']
  )
) {
  try {
    if (
      intent === 'platform_update' ||
      intent === 'updates' ||
      text.includes('platform update') ||
      text.includes('platform updates') ||
      text.includes('site update') ||
      text.includes('what changed') ||
      text.includes('recent changes') ||
      text.includes('new feature')
    ) {
      const r = await db.prepare(`
        SELECT
          pu.slug,
          pu.title,
          pu.excerpt,
          pu.content,
          pu.featured_image,
          pu.seo_title,
          pu.seo_description,
          pu.published_at,
          pu.updated_at,
          a.name AS author_name,
          a.slug AS author_slug,
          a.role AS author_role
        FROM platform_updates pu
        LEFT JOIN authors a
          ON pu.author_id = a.id
        WHERE pu.published = 1
        ORDER BY
          COALESCE(pu.published_at, pu.created_at) DESC
        LIMIT ${MAX_RESULTS}
      `).all();

      results.platformUpdates = (r.results || []).map(u => ({
        ...u,
        excerpt: truncate(u.excerpt, 300),
        content: truncate(u.content, 700)
      }));
    } else if (allSearchTerms.length > 0) {
      const conditions = allSearchTerms
        .map(() =>
          `LOWER(title) LIKE ?
           OR LOWER(slug) LIKE ?
           OR LOWER(excerpt) LIKE ?
           OR LOWER(content) LIKE ?`
        )
        .join(' OR ');

      const params = [];

      for (const term of allSearchTerms) {
        params.push(
          `%${term}%`,
          `%${term}%`,
          `%${term}%`,
          `%${term}%`
        );
      }

      const r = await db.prepare(`
        SELECT
          pu.slug,
          pu.title,
          pu.excerpt,
          pu.content,
          pu.featured_image,
          pu.seo_title,
          pu.seo_description,
          pu.published_at,
          pu.updated_at,
          a.name AS author_name,
          a.slug AS author_slug,
          a.role AS author_role
        FROM platform_updates pu
        LEFT JOIN authors a
          ON pu.author_id = a.id
        WHERE pu.published = 1
          AND (${conditions})
        ORDER BY
          COALESCE(pu.published_at, pu.created_at) DESC
        LIMIT ${MAX_RESULTS}
      `).bind(...params).all();

      results.platformUpdates = (r.results || []).map(u => ({
        ...u,
        excerpt: truncate(u.excerpt, 300),
        content: truncate(u.content, 700)
      }));
    }
  } catch (e) {
    console.error(
      'Lummet retrieve platform updates:',
      e.message
    );
  }
}

  // ═══════════════════════════════════════════════════
  // PAGES
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('pages', tablesToSearch, intent, ['general','educational','responsible_gambling','navigation'])) {
    try {
      if (allSearchTerms.length > 0) {
        const conditions = allSearchTerms.map(() => 'LOWER(title) LIKE ? OR LOWER(slug) LIKE ?').join(' OR ');
        const params = [];
        for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`);
        const r = await db.prepare(`
          SELECT slug, title, type FROM pages WHERE published = 1 AND (${conditions}) LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.pages = r.results || [];
      } else if (intent === 'navigation') {
        const r = await db.prepare(`
          SELECT slug, title, type FROM pages WHERE published = 1
          AND slug IN ('about','about-us','contact','responsible-gambling','terms','privacy','faq') LIMIT 10
        `).all();
        results.pages = r.results || [];
      }
    } catch (e) { console.error('Lummet retrieve pages:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // FAQs
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('faqs', tablesToSearch, intent, ['faq','general','educational','responsible_gambling'])) {
    try {
      if (allSearchTerms.length > 0) {
        const conditions = allSearchTerms.map(() => 'LOWER(question) LIKE ? OR LOWER(answer) LIKE ?').join(' OR ');
        const params = [];
        for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`);
        const r = await db.prepare(`
          SELECT slug, question, answer FROM faqs WHERE is_active = 1 AND (${conditions}) LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.faqs = r.results || [];
      } else if (intent === 'faq') {
        const r = await db.prepare(`SELECT slug, question, answer FROM faqs WHERE is_active = 1 ORDER BY created_at DESC LIMIT ${MAX_RESULTS}`).all();
        results.faqs = r.results || [];
      }
    } catch (e) { console.error('Lummet retrieve faqs:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // AUTHORS
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('authors', tablesToSearch, intent, ['authors','general'])) {
    try {
      if (allSearchTerms.length > 0) {
        const conditions = allSearchTerms.map(() => 'LOWER(name) LIKE ? OR LOWER(bio) LIKE ?').join(' OR ');
        const params = [];
        for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`);
        const r = await db.prepare(`
          SELECT slug, name, bio, role FROM authors WHERE published = 1 AND (${conditions}) LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.authors = (r.results || []).map(a => ({ ...a, bio: truncate(a.bio, 200) }));
      }

      // Follow-up attribution questions ("who wrote this?", "who wrote
      // that review?") don't name an author, so the search above finds
      // nothing -- the actual name only exists in the model's own prior
      // natural-language answer, in conversation history. Rather than
      // let it answer from unverified memory of that turn, try to pull
      // a name out of that answer text and verify it against the real
      // authors table so the profile link is genuine (or absent, if the
      // name doesn't check out).
      if (results.authors.length === 0 && /\bwho wrote\b|\bwrote (this|that|it)\b|\bauthor of\b/i.test(text) && Array.isArray(conversationHistory)) {
        const priorAnswers = conversationHistory.slice(-6)
          .filter(m => m.role === 'assistant')
          .map(m => m.content || '')
          .join('\n');
        const nameMatch = priorAnswers.match(/(?:written|authored|reviewed) by ([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,3})/i);
        if (nameMatch) {
          const authorName = nameMatch[1].trim();
          const r = await db.prepare(`
            SELECT slug, name, bio, role FROM authors WHERE published = 1 AND LOWER(name) = LOWER(?) LIMIT 1
          `).bind(authorName).first();
          if (r) results.authors = [{ ...r, bio: truncate(r.bio, 200) }];
        }
      }
    } catch (e) { console.error('Lummet retrieve authors:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // COUNTRIES
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('countries', tablesToSearch, intent, ['geo','licensing','general']) && detectedCountry) {
    try {
      const r = await db.prepare(`SELECT code, name, currency, language, legal_status FROM countries WHERE code = ? LIMIT 1`).bind(detectedCountry.toUpperCase()).first();
      if (r) results.countries = [r];
    } catch (e) { console.error('Lummet retrieve countries:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // CATEGORIES
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('categories', tablesToSearch, intent, ['casino_search','general']) && allSearchTerms.length > 0) {
    try {
      const conditions = allSearchTerms.map(() => 'LOWER(name) LIKE ? OR LOWER(description) LIKE ?').join(' OR ');
      const params = [];
      for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`);
      const r = await db.prepare(`SELECT slug, name, description FROM categories WHERE (${conditions}) LIMIT ${MAX_RESULTS}`).bind(...params).all();
      results.categories = r.results || [];
    } catch (e) { console.error('Lummet retrieve categories:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // COUNTRY & CATEGORY×COUNTRY SEO LANDING PAGES
  // (seo_pages: /en/country/:code/:slug custom guides,
  //  /en/category/:slug/:code hub pages — see migrations/0019)
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('seo_pages', tablesToSearch, intent, ['geo','licensing','casino_search','navigation','general']) &&
      isGeo && detectedCountry) {
    try {
      const countryCode = detectedCountry.toUpperCase();

      const customR = await db.prepare(`
        SELECT slug, country_code, title FROM seo_pages
        WHERE page_type = 'country_custom' AND country_code = ? AND published = 1
        ORDER BY updated_at DESC LIMIT ${MAX_RESULTS}
      `).bind(countryCode).all();
      for (const p of (customR.results || [])) {
        results.seoPages.push({ title: p.title, page_type: 'country_custom', url: `/en/country/${p.country_code.toLowerCase()}/${p.slug}` });
      }

      if (results.categories.length > 0) {
        const catSlugs = results.categories.map(c => c.slug);
        const placeholders = catSlugs.map(() => '?').join(',');
        const hubR = await db.prepare(`
          SELECT slug, country_code, title FROM seo_pages
          WHERE page_type = 'category_country' AND country_code = ? AND published = 1
            AND slug IN (${placeholders})
          ORDER BY updated_at DESC LIMIT ${MAX_RESULTS}
        `).bind(countryCode, ...catSlugs).all();
        for (const p of (hubR.results || [])) {
          results.seoPages.push({ title: p.title, page_type: 'category_country', url: `/en/category/${p.slug}/${p.country_code.toLowerCase()}` });
        }
      }
    } catch (e) { console.error('Lummet retrieve seo_pages:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // SEO META
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('seo_meta', tablesToSearch, intent, ['general','navigation']) && allSearchTerms.length > 0) {
    try {
      const conditions = allSearchTerms.map(() => 'LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(keywords) LIKE ?').join(' OR ');
      const params = [];
      for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`, `%${term}%`);
      const r = await db.prepare(`SELECT page_type, page_slug, title, description FROM seo_meta WHERE (${conditions}) LIMIT ${MAX_RESULTS}`).bind(...params).all();
      results.seoMeta = r.results || [];
    } catch (e) { console.error('Lummet retrieve seo_meta:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // PAYMENT METHODS (standalone /payment-methods pages)
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('payment_methods', tablesToSearch, intent, ['payments','crypto','general'])) {
    try {
      if (allSearchTerms.length > 0) {
        const conditions = allSearchTerms.map(() => 'LOWER(name) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(method_type) LIKE ? OR LOWER(description) LIKE ?').join(' OR ');
        const params = [];
        for (const term of allSearchTerms) params.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
        const r = await db.prepare(`
          SELECT slug, name, method_type, description FROM payment_methods
          WHERE published = 1 AND (${conditions}) ORDER BY sort_order ASC LIMIT ${MAX_RESULTS}
        `).bind(...params).all();
        results.paymentMethods = (r.results || []).map(p => ({ ...p, description: truncate(p.description, 250) }));
      } else if (intent === 'payments' || intent === 'crypto') {
        const r = await db.prepare(`
          SELECT slug, name, method_type, description FROM payment_methods
          WHERE published = 1 ${intent === 'crypto' ? "AND method_type = 'crypto'" : ''}
          ORDER BY sort_order ASC LIMIT ${MAX_RESULTS}
        `).all();
        results.paymentMethods = (r.results || []).map(p => ({ ...p, description: truncate(p.description, 250) }));
      }
    } catch (e) { console.error('Lummet retrieve payment_methods:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // NAVIGATION (site menu structure)
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('nav_items', tablesToSearch, intent, ['navigation','general'])) {
    try {
      if (intent === 'navigation' || allSearchTerms.some(t => ['menu','navigate','navigation','find','sitemap'].includes(t))) {
        const r = await db.prepare(`
          SELECT label, url, location, parent_id FROM nav_items
          WHERE enabled = 1 ORDER BY location ASC, position ASC LIMIT 40
        `).all();
        results.navItems = r.results || [];
      }
    } catch (e) { console.error('Lummet retrieve nav_items:', e.message); }
  }

  // ═══════════════════════════════════════════════════
  // HOMEPAGE SECTIONS / PUBLIC COMPONENTS
  // ═══════════════════════════════════════════════════
  if (shouldSearchTable('components', tablesToSearch, intent, ['navigation','general']) &&
      (intent === 'navigation' ||
       text.includes('homepage') || text.includes('home page') ||
       text.includes('what is on') || text.includes("what's on") ||
       text.includes('sections') || text.includes('layout') ||
       text.includes('what is this site') || text.includes('about this site') ||
       text.includes('what is this website'))) {
    try {
      const r = await db.prepare(`
        SELECT c.type, c.title, c.name FROM page_components pc
        JOIN components c ON c.id = pc.component_id
        WHERE pc.page_type = 'homepage' AND pc.page_slug = 'homepage'
          AND pc.enabled = 1 AND c.status = 'active'
        ORDER BY pc.position ASC LIMIT 20
      `).all();
      results.homepageSections = r.results || [];
    } catch (e) { console.error('Lummet retrieve homepage components:', e.message); }
  }

  return results;
}
