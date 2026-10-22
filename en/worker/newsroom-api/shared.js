import * as itemAccess from '../database/item-access.js';

export const NEWSROOM_ROLES = ['Reporter', 'Senior Reporter', 'Editor', 'Senior Editor', 'Managing Editor',
  'Researcher', 'Data Editor', 'Correspondent', 'Contributor'];

// ── Feature flags (system_settings, key LIKE 'news_%') ────────
// Descriptions shown in the admin UI. A flag not listed here still shows up
// (labelled with its raw key) if it exists in the database -- this list is
// documentation, not an allow-list for reads. Writes ARE allow-listed below.
export const FLAG_INFO = {
  news_editorial_workflow: { label: 'Editorial workflow', help: 'Draft -> review -> fact-check -> approve -> publish, with revision history. Off: legacy simple publishing.' },
  news_new_taxonomy: { label: 'Sections, regions, countries & topics', help: 'Section/region/country/topic/series pages, article badges & notices, discovery links. Needs sections/topics set up first.' },
  news_sources_display: { label: 'Public sources & methodology', help: 'Shows the Sources list and Reporting & Methodology on published articles.' },
  news_corrections_display: { label: 'Public corrections banner', help: 'Shows corrections, clarifications, updates and retractions on articles.' },
  news_entity_pages: { label: 'Entity pages', help: '/en/news/entity/<slug> pages and company/person chips on articles.' },
  news_v2_homepage: { label: 'News homepage v2', help: 'Replaces /en/news with the lead story, latest, most read, trending and section blocks.' },
  news_trending: { label: 'Trending block', help: 'Needs page-view data; shows a trending list on the homepage and in Most Read.' },
  news_analytics_enrichment: { label: 'Analytics enrichment', help: 'Records a bot flag, device type and UTM parameters on news page views from the moment this is turned on (not retroactive).' },
  news_google_sitemap: { label: 'Google News sitemap', help: 'Publishes /en/news-sitemap.xml. Only useful once the publication is accepted in Google Publisher Center.' },
  news_search_v2: { label: 'News search v2', help: 'Replaces /en/news?q= search. Rebuild the search index (Search tab) before turning this on.' },
};

export const QUEUE_VIEWS = ['drafts', 'assigned_to_me', 'review', 'factcheck', 'approved', 'scheduled', 'published', 'corrections'];

const MAX_BODY = 512 * 1024;

const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const ok = (data = {}) => respond({ success: true, ...data });

export const fail = (error, status = 400) => respond({ success: false, error }, status);

export const fromResult = (r, extra = {}) => (r.ok ? ok({ ...extra, ...(r.id !== undefined ? { id: r.id } : {}), ...(r.changed ? { changed: r.changed } : {}) }) : fail(r.error, r.status || 400));

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // non-browser / same-origin navigations omit it
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function readJson(request) {
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.toLowerCase().includes('application/json')) return { error: fail('Content-Type must be application/json', 415) };
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return { error: fail('Request too large', 413) };
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: fail('Request too large', 413) };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: fail('Invalid JSON body') };
    return { body };
  } catch { return { error: fail('Invalid JSON') }; }
}

// Load one article the caller may access for `action` (read|update), else null.
export async function accessibleArticle(env, user, id, action) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  const item = await itemAccess.getItemById(env.DB, 'news', n);
  if (!item) return null;
  return (await itemAccess.canAccessItem(env.DB, user, 'news', action, item)) ? item : null;
}
