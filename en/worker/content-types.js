// Content-type enablement — single source of truth for whether a
// given generic content type (sportsbook / affiliate_partner /
// custom) is turned on for this environment/tenant.
//
// Backed by the `content_types_enabled` settings row seeded in
// migration 0051 (Phase 2), defaulted to casino-only on every
// existing environment. Every touchpoint listed in the Phase 2
// report §8 (routing, listings, search, admin creation, related
// content, sitemaps, SEO, APIs) should call isContentTypeEnabled()
// rather than re-reading/parsing the setting itself, so there is
// exactly one place that knows the default and the parsing rules.

import { getSetting } from "./database/settings.js";

const DEFAULT_ENABLEMENT = {
  casino: true,
  sportsbook: false,
  affiliate_partner: false,
  custom: false,
};

let _cache = null; // per-isolate memo; settings changes take effect on the next cold start / cache clear below

/**
 * Returns the full enablement map for this environment, e.g.
 * { casino: true, sportsbook: true, affiliate_partner: false, custom: false }.
 * Casino is always treated as enabled regardless of what's stored --
 * it predates this system entirely and must never be toggleable off
 * by a missing/malformed settings row.
 */
export async function getContentTypeEnablement(env) {
  if (_cache) return _cache;
  try {
    const raw = await getSetting(env.DB, "content_types_enabled");
    const parsed = raw ? JSON.parse(raw) : {};
    _cache = { ...DEFAULT_ENABLEMENT, ...parsed, casino: true };
  } catch (e) {
    console.error("content_types_enabled setting is malformed, falling back to casino-only:", e.message);
    _cache = { ...DEFAULT_ENABLEMENT };
  }
  return _cache;
}

export async function isContentTypeEnabled(env, contentType) {
  const map = await getContentTypeEnablement(env);
  return !!map[contentType];
}

/** Call after an admin write to content_types_enabled so this isolate picks up the change immediately. */
export function clearContentTypeEnablementCache() {
  _cache = null;
}
