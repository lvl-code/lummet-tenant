import { authEngine } from './auth.js';
import { aiEngine } from './ai.js';

export const apiEngine = {
  async handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Direct Security Perimeter Interception Gate
    const isAuthorized = await authEngine.validateAdminRequest(request, env);
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Access Violation: Security Token Invalid" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. CREATE NEW OPERATOR: POST /en/api/casinos
    if (path === '/en/api/casinos' && request.method === 'POST') {
      try {
        const data = await request.json();
        await env.DB.prepare(`
          INSERT INTO casinos (slug, name, logo, rating, bonus_title, bonus_value, features, supported_countries, restricted_countries)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          data.slug, data.name, data.logo, data.rating, data.bonus_title, data.bonus_value,
          JSON.stringify(data.features || []), JSON.stringify(data.supported_countries || []), JSON.stringify(data.restricted_countries || [])
        ).run();

        return new Response(JSON.stringify({ success: true, message: `Casino asset '${data.name}' deployed.` }), { status: 201 });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400 });
      }
    }

    // 2. LIVE JURISDICTION OVERRIDE MATRIX ALTERATION: POST /en/api/geo-rules
    if (path === '/en/api/geo-rules' && request.method === 'POST') {
      try {
        const data = await request.json();
        await env.DB.prepare(`
          INSERT INTO geo_rules (casino_slug, country, status, bonus_override, notes)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(casino_slug, country) DO UPDATE SET status=excluded.status, bonus_override=excluded.bonus_override, notes=excluded.notes
        `).bind(data.casino_slug, data.country.toUpperCase(), data.status, data.bonus_override, data.notes).run();

        return new Response(JSON.stringify({ success: true, message: `Geo rule map synced for ${data.country}.` }), { status: 200 });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400 });
      }
    }

    // 3. ONDEMAND EDGE AI COPYWRITING FACTORY TASK: POST /en/api/ai/generate-review
    if (path === '/en/api/ai/generate-review' && request.method === 'POST') {
      try {
        const data = await request.json(); // Expected: { casino_name, slug, country }
        
        // Fires Llama-3 at the edge to build the copy variables instantly
        const aiGeneratedCopy = await aiEngine.generateReviewSummary(env, data.casino_name, data.country);

        // Instantly commit the generated content to your D1 cache block
        await env.DB.prepare(`
          INSERT INTO reviews (casino_slug, country, title, content, created_by_ai)
          VALUES (?, ?, ?, ?, 1)
          ON CONFLICT(casino_slug, country) DO UPDATE SET content=excluded.content, created_by_ai=1
        `).bind(data.slug, data.country, `${data.casino_name} Localized Analysis Guide`, aiGeneratedCopy).run();

        return new Response(JSON.stringify({ success: true, content: aiGeneratedCopy }), { status: 200 });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400 });
      }
    }

    return new Response(JSON.stringify({ error: "API Endpoint Allocation Missing" }), { status: 404 });
  }
};
