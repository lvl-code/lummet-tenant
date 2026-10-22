// ============================================================
// en/worker/newsroom-api.js  --  Stage C: newsroom admin API + save hooks
//
// Mounted from api.js AFTER authentication, so `user` is always a real
// session user. Every endpoint additionally:
//   * requires application/json + same-origin for writes (defence in depth
//     on top of SameSite=Lax session cookies)
//   * checks a specific news.<action> permission (checkPermission)
//   * applies item-level access (canAccessItem) for per-article endpoints;
//     an inaccessible article answers 404, same as the existing news API
//   * uses only bound parameters; never returns internal columns to callers
//     that lack news.read
//
// The coarse write gate in api.js (prefix /api/v1/news -> resource "news")
// also covers these paths, as an extra layer.
//
// Feature flags: workflow endpoints require `news_editorial_workflow`.
// Data-entry endpoints (taxonomy, meta, sources, corrections) are always
// available to authorised users: they only write additive tables and change
// nothing public until the public-rendering flags are switched on.
// ============================================================

// The code lives in newsroom-api/*.js (see docs/ARCHITECTURE_NEWSROOM_API.md); this file keeps the public import path.
export { NEWSROOM_ROLES } from "./newsroom-api/shared.js";
export { handleNewsroomApi } from "./newsroom-api/dispatch.js";
export { searchReindexHook, slugRedirectHook, beforeNewsUpdate, afterNewsUpdate } from "./newsroom-api/hooks.js";
