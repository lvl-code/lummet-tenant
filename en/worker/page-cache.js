// =====================================================
// PUBLIC PAGE CACHE (stale-while-revalidate, per country)
// =====================================================
// Serves a whole rendered public page from the data centre's own cache (the
// Cache API: free, no write limit; KV only where that does not exist), so
// most visits cost one cache read instead of ~15 D1 queries. Safe because:
//  - only anonymous GET requests with no query string are cached, only 200s;
//  - the view events a page fires (CASINO_VIEW, OFFER_VIEW, ...) are recorded
//    when it is rendered and replayed, with the visitor's own country, city
//    and referrer, on every hit -- so analytics keep counting every view;
//  - a page that fires anything unusual (extra fields) is never cached;
//  - any successful admin save bumps an epoch, which instantly retires every
//    cached page (see bumpPageEpoch).
import { getCached, setCached, getLocal, setLocal } from "./cache.js";
import { eventCapture, logEvent } from "./database/analytics.js";
import { geoEngine } from "./geo.js";

export const PAGE_CACHE_CFG = {
  FRESH_SECONDS: 600,  // serve without refreshing inside this window
  KV_TTL: 86400,       // (cache lifetime) a stale copy is served instantly (and refreshed) for up to a day,
                       // so a quiet site's visitors never wait for a cold render
  LOCK_SECONDS: 30,
};

const CACHEABLE = new Set([
  "home", "casino", "casinoList", "review", "reviewList", "news", "newsList",
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
  "countryCode", "city", "referrer", "landingPage", "metadata",
]);

// BANNER_VIEW carries { componentId, componentName, pageType, pageSlug }: the same for every
// visitor, so safe to replay. Anything bigger or nested is not.
function plainMetadata(m) {
  if (m == null) return true;
  if (typeof m !== "object" || Array.isArray(m)) return false;
  let size = 0;
  for (const v of Object.values(m)) {
    if (v != null && typeof v === "object") return false;
    size += String(v ?? "").length;
  }
  return size <= 1000;
}

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

// Name of the first thing that makes a set of events unsafe to replay, or null.
function badEventField(events) {
  for (const e of events) {
    for (const k of Object.keys(e)) {
      if (e[k] === undefined || e[k] === null) continue;
      if (!EVENT_FIELDS.has(k)) return k;
      if (k === "metadata" && !plainMetadata(e[k])) return "metadata";
    }
  }
  return null;
}

function cleanEvents(events) { return badEventField(events) ? null : events; }

// Why a rendered response is not cached (shown in x-page-cache), or null if it can be.
function skipReason(response, events) {
  if (!response || response.status !== 200) return "skip:status";
  const type = response.headers.get("content-type") || "";
  if (!/text\/html|application\/json/.test(type)) return "skip:type";
  const bad = badEventField(events);
  return bad ? `skip:event-field-${bad}` : null;
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
  const headers = { "content-type": entry.type, "x-page-cache": state, "x-page-store": pageStore.last };
  if (entry.cc) headers["cache-control"] = entry.cc;
  return new Response(entry.html, { status: 200, headers });
}

// What the last save in this isolate did: "cache", "kv", "failed" or "none".
// Shown on every cached response as x-page-store, so a broken save is visible.
export const pageStore = { last: "none" };

async function store(env, key, entry) {
  pageStore.last = await setLocal(env, key, entry, PAGE_CACHE_CFG.KV_TTL);
}

// Refreshes are de-duplicated per isolate in memory (no KV write); an occasional
// duplicate refresh in another isolate is harmless.
const refreshing = new Map();

async function refresh(request, env, key, render) {
  const until = refreshing.get(key);
  if (until && until > Date.now()) return;
  refreshing.set(key, Date.now() + PAGE_CACHE_CFG.LOCK_SECONDS * 1000);
  if (refreshing.size > 500) refreshing.delete(refreshing.keys().next().value);
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

  const entry = await getLocal(env, key);

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
  const reason = response.status === 200 ? skipReason(response, events) : "skip:status";
  if (response.status === 200 && !reason) {
    const copy = response.clone();
    const html = await copy.text();
    const e = toEntry(response, html, events);
    if (e) {
      const write = store(env, key, e);
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(write); else await write;
    }
  }
  try {
    const out = new Response(response.body, response);
    out.headers.set("x-page-cache", reason || "miss");
    out.headers.set("x-page-store", pageStore.last);
    return out;
  } catch { return response; }
}

/**
 * Scheduled warm-up: re-renders the home page and the pages visitors actually
 * open (taken from the Speed samples, if migration 0065 is applied), for the
 * countries they come from, so the first visitor after a quiet spell gets a
 * cached page instead of waiting for a cold render. Best effort and bounded.
 *
 * makeRender(request) -> (ctx) => Promise<Response>
 */
export async function warmPublicPages(env, makeRender, { maxRenders = 12 } = {}) {
  if (!env.CACHE || !env.DB || !eventCapture || !env.SITE_URL) return 0;
  let origin;
  try { origin = new URL(env.SITE_URL); } catch { return 0; }

  const paths = new Set(["/en"]);
  const countries = new Set(["RW"]);
  try {
    const p = await env.DB.prepare(
      "SELECT path, COUNT(*) AS c FROM perf_samples WHERE at >= datetime('now','-7 days') GROUP BY path ORDER BY c DESC LIMIT 10"
    ).all();
    for (const r of p.results || []) if (r.path && r.path.startsWith("/en") && !r.path.startsWith("/en/dashboard")) paths.add(r.path);
    const c = await env.DB.prepare(
      "SELECT country, COUNT(*) AS c FROM perf_samples WHERE at >= datetime('now','-7 days') AND country IS NOT NULL GROUP BY country ORDER BY c DESC LIMIT 4"
    ).all();
    for (const r of c.results || []) if (/^[A-Z]{2}$/.test(r.country)) countries.add(r.country);
  } catch { /* no samples yet: just the home page for the default country */ }

  let done = 0;
  const stamp = await epoch(env);
  for (const path of paths) {
    for (const country of countries) {
      if (done >= maxRenders) return done;
      try {
        const request = new Request(origin.origin + path, { headers: { "user-agent": "page-cache-warmup" } });
        Object.defineProperty(request, "cf", { value: { country, city: "Unknown" }, configurable: true });
        const { getRoute } = await import("./routes.js");
        const routeType = getRoute(request).type;
        if (!isCacheableRequest(request, routeType)) continue;
        const key = `pc:${stamp}:${origin.hostname}:${country}:${path}`;
        refreshing.delete(key);
        await refresh(request, env, key, makeRender(request));
        done++;
      } catch (e) {
        console.error("warm-up failed for", path, e && e.message);
      }
    }
  }
  return done;
}
