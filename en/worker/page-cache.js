// =====================================================
// PUBLIC PAGE CACHE (stale-while-revalidate, per country)
// =====================================================
// Serves a whole rendered public page from KV, so most visits cost one KV
// read instead of ~15 D1 queries. Safe because:
//  - only anonymous GET requests with no query string are cached, only 200s;
//  - the view events a page fires (CASINO_VIEW, OFFER_VIEW, ...) are recorded
//    when it is rendered and replayed, with the visitor's own country, city
//    and referrer, on every hit -- so analytics keep counting every view;
//  - a page that fires anything unusual (extra fields) is never cached;
//  - any successful admin save bumps an epoch, which instantly retires every
//    cached page (see bumpPageEpoch).
import { getCached, setCached } from "./cache.js";
import { eventCapture, logEvent } from "./database/analytics.js";
import { geoEngine } from "./geo.js";

export const PAGE_CACHE_CFG = {
  FRESH_SECONDS: 300,  // serve without refreshing inside this window
  KV_TTL: 900,         // a stale copy is never served longer than this
  LOCK_TTL: 30,
};

const CACHEABLE = new Set([
  "casino", "casinoList", "review", "reviewList", "news", "newsList",
  "category", "categoryList", "country", "countryList", "categoryCountryPage", "countryCustomPage",
  "sportsbook", "sportsbookReview", "sportsbookList",
  "affiliatePartner", "affiliatePartnerReview", "affiliatePartnerList",
  "custom", "customList", "customReview", "comparison", "comparisonList",
  "author", "authorList", "update", "updatesList", "page",
  "paymentMethod", "paymentMethodList", "researchHub", "researchTypeList", "researchItem",
  "contentLandingPage",
]);

// event fields a replay is allowed to carry; anything else => do not cache
const EVENT_FIELDS = new Set([
  "eventType", "casinoId", "reviewId", "pageId", "newsId", "offerId", "contentItemId",
  "countryCode", "city", "referrer", "landingPage",
]);

// first path segment after /api/v1/ that visitors write to (never content)
const VISITOR_API = new Set([
  "auth", "newsletter", "user", "analytics", "ai", "ai-studio", "public",
  "stats", "report", "reports", "search", "setup",
]);

const EPOCH_KEY = "pc:epoch";

export function isCacheableRequest(request, routeType) {
  if (request.method !== "GET") return false;
  if (!CACHEABLE.has(routeType)) return false;
  let url;
  try { url = new URL(request.url); } catch { return false; }
  if (url.hostname.startsWith("lummet.")) return false;
  return url.search === "" || url.search === "?partial=1";
}

export function isContentWrite(request, status) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return false;
  if (status < 200 || status >= 300) return false;
  let path;
  try { path = new URL(request.url).pathname; } catch { return false; }
  const m = path.match(/^\/(?:en\/)?api\/v1\/([^/]+)/);
  return !!m && !VISITOR_API.has(m[1]);
}

export async function bumpPageEpoch(env) {
  if (!env.CACHE) return;
  try {
    // this isolate sees it at once; others within the short in-memory window
    await setCached(env, EPOCH_KEY, String(Date.now()), 86400);
  } catch (e) {
    console.error("page epoch bump failed:", e.message);
  }
}

async function epoch(env) {
  const v = await getCached(env, EPOCH_KEY);
  return v ? String(v) : "0";
}

function visitorGeo(request) {
  const edge = { country: request.cf?.country || null, city: request.cf?.city || "Unknown" };
  const g = geoEngine.process(request, edge);
  return { country: g.country || null, city: g.city || "Unknown" };
}

function replayEvents(request, env, ctx, events) {
  if (!events || !events.length || !ctx || typeof ctx.waitUntil !== "function") return;
  const geo = visitorGeo(request);
  for (const e of events) {
    ctx.waitUntil(
      logEvent(env.DB, {
        ...e,
        countryCode: geo.country,
        city: geo.city,
        referrer: request.headers.get("referer") || null,
      }).catch(() => {})
    );
  }
}

function cleanEvents(events) {
  for (const e of events) {
    for (const k of Object.keys(e)) {
      if (!EVENT_FIELDS.has(k) && e[k] !== undefined && e[k] !== null) return null;
    }
  }
  return events;
}

// Renders once, recording the view events it fires. `suppress` = background
// refresh: record them but do not write them (the visitor's own event was
// already written, or is replayed from the stored copy).
async function renderCaptured(render, suppress) {
  const pending = [];
  const fakeCtx = suppress ? { waitUntil: (p) => { pending.push(p); } } : null;
  const store = { events: [], suppress };
  const run = () => render(fakeCtx);
  const response = eventCapture ? await eventCapture.run(store, run) : null;
  if (suppress && pending.length) await Promise.allSettled(pending);
  return { response, events: store.events };
}

function toEntry(response, html, events) {
  if (!response || response.status !== 200) return null;
  const type = response.headers.get("content-type") || "";
  if (!/text\/html|application\/json/.test(type)) return null;
  const clean = cleanEvents(events);
  if (!clean) return null;
  return {
    html, type,
    cc: response.headers.get("cache-control") || "",
    events: clean, generatedAt: Date.now(),
  };
}

function fromEntry(entry, state) {
  const headers = { "content-type": entry.type, "x-page-cache": state };
  if (entry.cc) headers["cache-control"] = entry.cc;
  return new Response(entry.html, { status: 200, headers });
}

async function store(env, key, entry) {
  try { await env.CACHE.put(key, JSON.stringify(entry), { expirationTtl: PAGE_CACHE_CFG.KV_TTL }); }
  catch (e) { console.error("page cache put failed:", e.message); }
}

async function refresh(request, env, key, render) {
  const lock = `lock:${key}`;
  try {
    if (await env.CACHE.get(lock)) return;
    await env.CACHE.put(lock, "1", { expirationTtl: PAGE_CACHE_CFG.LOCK_TTL });
  } catch { /* uncoordinated refresh is harmless */ }
  try {
    const { response, events } = await renderCaptured(render, true);
    if (!response) return;
    const html = await response.clone().text();
    const entry = toEntry(response, html, events);
    if (entry) await store(env, key, entry);
  } catch (e) {
    console.error("page cache refresh failed:", e.message);
  }
}

/**
 * render(ctx) must produce the normal response for this request. Pass the
 * ctx it should use (the real one, or a stand-in during a background refresh).
 */
export async function cachedPage(request, env, ctx, routeType, render) {
  if (!env.CACHE || !env.DB || !eventCapture || !isCacheableRequest(request, routeType)) {
    return render(ctx);
  }
  const url = new URL(request.url);
  const geo = visitorGeo(request);
  const key = `pc:${await epoch(env)}:${url.hostname}:${geo.country || "XX"}:${url.pathname}${url.search}`;

  let entry = null;
  try { const raw = await env.CACHE.get(key); entry = raw ? JSON.parse(raw) : null; } catch { entry = null; }

  if (entry && typeof entry.html === "string") {
    replayEvents(request, env, ctx, entry.events);
    const age = (Date.now() - entry.generatedAt) / 1000;
    if (age > PAGE_CACHE_CFG.FRESH_SECONDS && ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(refresh(request, env, key, (c) => render(c)));
    }
    return fromEntry(entry, age > PAGE_CACHE_CFG.FRESH_SECONDS ? "stale" : "hit");
  }

  // miss: render normally (the visitor's own events are written as usual)
  const { response, events } = await renderCaptured(render.bind(null, ctx), false);
  if (!response) return render(ctx);
  if (response.status === 200) {
    const copy = response.clone();
    const html = await copy.text();
    const e = toEntry(response, html, events);
    if (e) {
      const write = store(env, key, e);
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(write); else await write;
    }
  }
  return response;
}
