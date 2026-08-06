// =====================================================
// LUMMET AI — Admin API & AI Command Layer
// =====================================================

//import { aiEngine } from '../ai.js';
import { generateReview, generateSeo, generateFAQs } from '../ai/admin-tools.js';

const MODEL = '@cf/zai-org/glm-4.7-flash';

// ── Auth middleware ──
async function verifyAdmin(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  try {
    const row = await env.DB.prepare(`
      SELECT u.id, u.email, u.role FROM users u
      JOIN sessions s ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
      AND u.role IN ('admin', 'editor')
    `).bind(token).first();
    return row || null;
  } catch {
    return null;
  }
}

// ── Main admin route handler ──
export async function handleAdminAPI(request, env, path) {
  const url = new URL(request.url);
  const route = path.replace('/api/admin/', '');

  // ── Login (no auth required) ──
  if (route === 'login' && request.method === 'POST') {
    return handleLogin(request, env);
  }

  // ── All other routes require admin auth ──
  const admin = await verifyAdmin(request, env);
  if (!admin) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ── Data listing ──
  if (route === 'casinos' && request.method === 'GET') return listCasinos(env);
  if (route === 'reviews' && request.method === 'GET') return listReviews(env);
  if (route === 'news' && request.method === 'GET') return listNews(env);
  if (route === 'pages' && request.method === 'GET') return listPages(env);

  // ── Toggle publish ──
  if (route === 'toggle-publish' && request.method === 'POST') {
    return handleTogglePublish(request, env);
  }

  // ── AI Command Console ──
  if (route === 'ai-command' && request.method === 'POST') {
    return handleAICommand(request, env, admin);
  }

  // ── Generate review ──
  if (route === 'generate-review' && request.method === 'POST') {
    return handleGenerateReview(request, env);
  }

  // ── Bulk operations ──
  if (route === 'bulk-seo' && request.method === 'POST') return handleBulkSEO(request, env);
  if (route === 'bulk-faqs' && request.method === 'POST') return handleBulkFAQs(request, env);
  if (route === 'bulk-reviews' && request.method === 'POST') return handleBulkReviews(request, env);

  return Response.json({ error: 'Not found' }, { status: 404 });
}

// ── Login ──
async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return Response.json({ success: false }, { status: 400 });

    // Hash password
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    const user = await env.DB.prepare(`
      SELECT id, email, role FROM users WHERE email = ? AND password = ? AND role IN ('admin','editor')
    `).bind(email.toLowerCase(), hashHex).first();

    if (!user) return Response.json({ success: false }, { status: 401 });

    const token = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now','+7 days'))
    `).bind(user.id, token).run();

    return Response.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

// ── List casinos ──
async function listCasinos(env) {
  const r = await env.DB.prepare(`SELECT id, slug, name, rating, bonus_title, published, featured FROM casinos ORDER BY featured DESC, rating DESC LIMIT 100`).all();
  return Response.json({ casinos: r.results || [] });
}

async function listReviews(env) {
  const r = await env.DB.prepare(`SELECT id, slug, title, casino_slug, rating, published FROM reviews ORDER BY created_at DESC LIMIT 100`).all();
  return Response.json({ reviews: r.results || [] });
}

async function listNews(env) {
  const r = await env.DB.prepare(`SELECT id, slug, title, published, created_at FROM news ORDER BY created_at DESC LIMIT 100`).all();
  return Response.json({ news: r.results || [] });
}

async function listPages(env) {
  const r = await env.DB.prepare(`SELECT id, slug, title, type, published FROM pages ORDER BY title ASC LIMIT 100`).all();
  return Response.json({ pages: r.results || [] });
}

// ── Toggle publish ──
async function handleTogglePublish(request, env) {
  try {
    const { table, slug } = await request.json();
    const validTables = ['casinos', 'reviews', 'news', 'pages'];
    if (!validTables.includes(table)) return Response.json({ error: 'Invalid table' }, { status: 400 });

    await env.DB.prepare(`UPDATE ${table} SET published = CASE WHEN published = 1 THEN 0 ELSE 1 END WHERE slug = ?`).bind(slug).run();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ── AI Command Console ──
async function handleAICommand(request, env, admin) {
  try {
    const { command } = await request.json();
    if (!command) return Response.json({ error: 'No command provided' }, { status: 400 });

    // Use AI to understand the command and generate SQL
    const result = await interpretAndExecuteCommand(env, command, admin);
    return Response.json({ success: true, result });
  } catch (e) {
    console.error('AI command error:', e.message);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * The AI command interpreter — the core of the admin system
 * Uses LLM to understand natural language and execute database operations
 */
async function interpretAndExecuteCommand(env, command, admin) {
  const SCHEMA = `Database tables and their columns:
- casinos: id, slug, name, logo, website_url, affiliate_url, rating, bonus_title, bonus_value, license, owner, features, supported_countries, restricted_countries, seo_title, seo_description, published, featured, sort_order, status
- reviews: id, casino_slug, country_code, slug, title, content, pros, cons, rating, seo_title, seo_description, ai_generated, published, overview, games, bonuses, payments, licenses, faq_json, verdict, author, author_title
- news: id, slug, title, content, author, ai_generated, seo_title, seo_description, published, excerpt, tags, author_id, published_at
- pages: id, slug, title, content, type, author_id, seo_title, seo_description, published
- faqs: id, slug, question, answer, is_active
- authors: id, slug, name, bio, role, published
- categories: id, slug, name, description
- geo_rules: id, casino_slug, country_code, status, bonus_override, priority
- seo_meta: id, page_type, page_slug, title, description, keywords, canonical, og_title, og_description, schema_json`;

  const systemPrompt = `You are a database admin assistant for Level.casino. The admin sent a natural language command. Convert it into safe SQL operations.

${SCHEMA}

Rules:
- Only generate SELECT, UPDATE, INSERT, or DELETE statements
- Never generate DROP or ALTER statements
- For SELECT queries, return the SQL
- For UPDATE/INSERT/DELETE, return the SQL and a description
- Always use parameterized queries (use ? for values, list values separately)
- For INSERT statements, generate a slug from the name if needed
- For dates, use datetime('now')
- Be conservative — if the command is ambiguous, ask for clarification

Respond with ONLY a raw JSON object:
{"action":"select|update|insert|delete","sql":"...","params":[...],"description":"...","needs_confirmation":true|false}

For SELECT: needs_confirmation = false (safe to run)
For UPDATE/INSERT/DELETE: needs_confirmation = true (show to admin first)
If the command is unclear: {"action":"clarify","description":"I need more info about..."}`;

  const result = await env.AI.run(MODEL, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: command }
    ],
    temperature: 0.1,
    max_tokens: 500
  });

  let response = result?.response || result?.choices?.[0]?.message?.content || '';
  response = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return 'Could not understand the command. Please try rephrasing.';

  const plan = JSON.parse(jsonMatch[0]);

  if (plan.action === 'clarify') {
    return plan.description || 'I need more information to execute this command.';
  }

  if (plan.action === 'select') {
    try {
      const r = await env.DB.prepare(plan.sql).bind(...(plan.params || [])).all();
      const results = r.results || [];
      if (results.length === 0) return 'No results found.';
      // Format results as a readable table
      const cols = Object.keys(results[0]);
      const header = cols.join(' | ');
      const rows = results.map(r => cols.map(c => String(r[c] ?? '')).join(' | ')).join('\n');
      return `Found ${results.length} records:\n\n${header}\n${'─'.repeat(header.length)}\n${rows}`;
    } catch (e) {
      return `Query failed: ${e.message}`;
    }
  }

  if (plan.action === 'update' || plan.action === 'insert' || plan.action === 'delete') {
    try {
      const r = await env.DB.prepare(plan.sql).bind(...(plan.params || [])).run();
      const affected = r.meta?.changes || 0;
      return `${plan.description || 'Operation completed'}\n\nRows affected: ${affected}`;
    } catch (e) {
      return `Operation failed: ${e.message}`;
    }
  }

  return 'Could not determine the action from the command.';
}

// ── Generate review ──
async function handleGenerateReview(request, env) {
  try {
    const { casinoName, countryCode } = await request.json();
    const slug = casinoName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const review = await generateReview(env, casinoName, countryCode || 'RW', slug);

    if (review) {
      // Save to database
      await env.DB.prepare(`
        INSERT INTO reviews (casino_slug, slug, title, content, rating, published, ai_generated, author, created_at)
        VALUES (?, ?, ?, ?, 0, 0, 1, 'Lummet AI', datetime('now'))
      `).bind(slug, `${slug}-review`, `${casinoName} Casino Review`, review).run();
    }

    return Response.json({ success: true, review });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ── Bulk SEO ──
async function handleBulkSEO(request, env) {
  try {
    const casinos = await env.DB.prepare(`
      SELECT slug, name, bonus_title, license FROM casinos WHERE published = 1 AND (seo_title IS NULL OR seo_title = '')
    `).all();

    let count = 0;
    for (const casino of (casinos.results || [])) {
      try {
        const seo = await generateSeo(env, 'level.casino', {
          type: 'casino', slug: casino.slug, country: 'Global'
        });
        if (seo) {
          await env.DB.prepare(`UPDATE casinos SET seo_title = ?, seo_description = ? WHERE slug = ?`)
            .bind(seo.title || '', seo.description || '', casino.slug).run();
          count++;
        }
      } catch (e) { console.error(`SEO for ${casino.slug}:`, e.message); }
    }
    return Response.json({ success: true, result: `Generated SEO for ${count} casinos.` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ── Bulk FAQs ──
async function handleBulkFAQs(request, env) {
  try {
    const casinos = await env.DB.prepare(`SELECT slug, name FROM casinos WHERE published = 1`).all();
    let count = 0;
    for (const casino of (casinos.results || [])) {
      try {
        const faqs = await generateFAQs(env, casino.name);
        if (faqs && faqs.length > 0) {
          await env.DB.prepare(`UPDATE reviews SET faq_json = ? WHERE casino_slug = ?`)
            .bind(JSON.stringify(faqs), casino.slug).run();
          count++;
        }
      } catch (e) { console.error(`FAQs for ${casino.slug}:`, e.message); }
    }
    return Response.json({ success: true, result: `Generated FAQs for ${count} casinos.` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// ── Bulk reviews ──
async function handleBulkReviews(request, env) {
  try {
    // Find casinos without reviews
    const casinos = await env.DB.prepare(`
      SELECT c.slug, c.name FROM casinos c
      LEFT JOIN reviews r ON r.casino_slug = c.slug
      WHERE c.published = 1 AND r.id IS NULL
    `).all();

    let count = 0;
    for (const casino of (casinos.results || [])) {
      try {
        const review = await generateReview(env, casino.name, 'RW', casino.slug);
        if (review) {
          await env.DB.prepare(`
            INSERT INTO reviews (casino_slug, slug, title, content, rating, published, ai_generated, author, created_at)
            VALUES (?, ?, ?, ?, 0, 0, 1, 'Lummet AI', datetime('now'))
          `).bind(casino.slug, `${casino.slug}-review`, `${casino.name} Casino Review`, review).run();
          count++;
        }
      } catch (e) { console.error(`Review for ${casino.slug}:`, e.message); }
    }
    return Response.json({ success: true, result: `Generated ${count} reviews.` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
