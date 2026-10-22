import * as permDB from '../database/permissions.js';
import { logAudit } from '../database/audit.js';
import { invalidateNews } from '../cache.js';
import * as nr from '../database/newsroom.js';
import { resetNewsFlagCache } from '../database/newsroom.js';
import * as tx from '../database/newsroom-taxonomy.js';
import * as trust from '../newsroom-trust.js';
import * as stats from '../newsroom-stats.js';
import * as analytics from '../newsroom-analytics.js';
import * as search from '../newsroom-search.js';
import { FLAG_INFO, NEWSROOM_ROLES, accessibleArticle, fail, fromResult, ok, readJson, sameOrigin } from "./shared.js";
import { listQueue, loadBundle, safeParse, safeRevision, saveAuthorProfile, saveMediaCredit, snapshot } from "./helpers.js";

// ── Main dispatcher ──────────────────────────────────────────
export async function handleNewsroomApi(request, env, user) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/en(?=\/)/, '');    // normalize, same as routes.js
  if (!path.startsWith('/api/v1/newsroom/')) return null;
  if (!user) return fail('Unauthorized', 401);

  const route = path.slice('/api/v1/newsroom/'.length);
  const isWrite = request.method === 'POST';
  if (request.method !== 'GET' && !isWrite) return fail('Method not allowed', 405);
  if (isWrite && !sameOrigin(request)) return fail('Cross-origin request refused', 403);

  const perms = await permDB.getPermissionsForUser(env.DB, user);
  const can = (a) => permDB.checkPermission(perms, 'news', a);
  const actor = { user_id: user.user_id };

  try {
    // ---------- reads ----------
    if (!isWrite) {
      if (!can('read')) return fail('Forbidden', 403);

      if (route === 'article') {
        const item = await accessibleArticle(env, user, url.searchParams.get('id'), 'read');
        if (!item) return fail('News article not found', 404);
        return ok(await loadBundle(env.DB, item.id, perms));
      }
      if (route === 'revisions') {
        const item = await accessibleArticle(env, user, url.searchParams.get('id'), 'read');
        if (!item) return fail('News article not found', 404);
        return ok({ revisions: await nr.listRevisions(env.DB, item.id, perms) });
      }
      if (route === 'revision') {
        const item = await accessibleArticle(env, user, url.searchParams.get('id'), 'read');
        if (!item) return fail('News article not found', 404);
        const rev = await nr.getRevision(env.DB, item.id, Number(url.searchParams.get('v')), perms);
        return rev ? ok({ revision: rev }) : fail('Revision not found', 404);
      }
      if (route === 'queue') return listQueue(env, user, url, actor);
      if (route === 'trust-pages/list') return can('manage_settings') ? ok({ pages: await trust.listTrustPages(env.DB) }) : fail('Forbidden', 403);
      if (route === 'trust-pages/get') {
        const p = await trust.getTrustPage(env.DB, url.searchParams.get('slug'), perms);
        return p ? ok({ page: { ...p, content: safeParse(p.content_json, p.content_json) } }) : fail('Trust page not found', 404);
      }
      if (route === 'pins/list') {
        const slot = url.searchParams.get('slot');
        if (!stats.PIN_SLOTS.includes(slot)) return fail('invalid slot');
        const r = await env.DB.prepare(`SELECT p.news_id, p.position, p.starts_at, p.ends_at, n.slug, n.title FROM news_pins p JOIN news n ON n.id = p.news_id WHERE p.slot = ? ORDER BY p.position, p.id`).bind(slot).all();
        return ok({ slot, pins: r.results || [] });
      }
      if (route === 'regions/countries') {
        const region = url.searchParams.get('region');
        const r = await env.DB.prepare(`SELECT country_code FROM news_region_countries WHERE region_slug = ? ORDER BY country_code`).bind(region).all();
        return ok({ region, country_codes: (r.results || []).map((x) => x.country_code) });
      }
      if (route === 'authors/list') {
        if (!can('manage_authors')) return fail('Forbidden', 403);
        const r = await env.DB.prepare(`SELECT id, slug, name, role, job_title, expertise, location, website_url, published FROM authors ORDER BY name`).all();   // no email / private columns
        return ok({ authors: r.results || [] });
      }
      if (route === 'analytics/overview') {
        if (!can('view_analytics')) return fail('Forbidden', 403);
        const days = Number(url.searchParams.get('days') || 30);
        const r = await analytics.getOverview(env.DB, env, user, { days, siteHost: url.hostname });
        if (!r.ok) return fail(r.error, r.status);
        const [trending] = await Promise.all([stats.getTrending(env.DB, env, 5)]);
        const { ok: _ok, ...rest } = r;
        return ok({ ...rest, trending: trending.map((a) => ({ id: a.id, slug: a.slug, title: a.title })) });
      }
      if (route === 'analytics/article') {
        if (!can('view_analytics')) return fail('Forbidden', 403);
        const item = await accessibleArticle(env, user, url.searchParams.get('id'), 'read');
        if (!item) return fail('News article not found', 404);
        const r = await analytics.getArticlePerformance(env.DB, item.id, { days: Number(url.searchParams.get('days') || 30), siteHost: url.hostname });
        if (!r.ok) return fail(r.error, r.status);
        const { ok: _ok, ...rest } = r;
        return ok(rest);
      }
      if (route === 'search') {
        const p = search.parseSearchParams(url.searchParams);
        const r = await search.searchNews(env.DB, p, { mode: 'admin', user, pageSize: 25 });
        if (!r.ok) return fail(r.error, r.status);
        return ok({ articles: r.articles, total: r.total, page: r.page, page_size: r.page_size, invalid_filters: r.invalid_filters });
      }
      if (route === 'search/status') {
        if (!can('manage_settings')) return fail('Forbidden', 403);
        return ok({ ...(await search.indexStatus(env.DB)), enabled: await nr.isNewsFlagEnabled(env.DB, 'news_search_v2') });
      }
      if (route === 'slug-conflicts') return ok({ conflicts: await nr.findSlugCollisions(env.DB) }); // articles shadowing a section page
      if (route === 'taxonomy/list') {
        const list = await tx.listTaxonomy(env.DB, url.searchParams.get('kind'), { includeInactive: url.searchParams.get('all') === '1' && can('manage_taxonomy') });
        return list ? ok({ items: list }) : fail('Unknown taxonomy kind', 404);
      }
      if (route === 'flags') {
        if (!can('manage_settings')) return fail('Forbidden', 403);
        const rows = (await env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'news_%' ORDER BY key`).all()).results || [];
        return ok({ flags: rows.map((r) => ({ key: r.key, value: String(r.value).toLowerCase() === 'true', ...(FLAG_INFO[r.key] || { label: r.key, help: '' }) })) });
      }
      if (route === 'meta') return ok({
        article_types: nr.ARTICLE_TYPES, content_classes: nr.CONTENT_CLASSES, labels: nr.LABELS, source_types: nr.SOURCE_TYPES,
        correction_types: nr.CORRECTION_TYPES, relation_types: nr.RELATION_TYPES, workflow_statuses: nr.WORKFLOW_STATUSES,
        fact_check_statuses: nr.FACT_CHECK_STATUSES, entity_types: tx.ENTITY_TYPES, author_roles: NEWSROOM_ROLES,
        workflow_enabled: await nr.isNewsFlagEnabled(env.DB, 'news_editorial_workflow'),
        regions: (await env.DB.prepare(`SELECT slug, name FROM news_regions WHERE active = 1 ORDER BY display_order`).all()).results || [],
        permissions: {   // lets the UI hide controls the server would refuse; the server still enforces everything
          manage_taxonomy: can('manage_taxonomy'), manage_sources: can('manage_sources'), correct: can('correct'),
          retract: can('retract'), manage_settings: can('manage_settings'), manage_authors: can('manage_authors'), view_analytics: can('view_analytics'), factcheck: can('factcheck'), review: can('review'), publish: can('publish'), schedule: can('schedule'), update: can('update')
        }
      });
      return fail('Not found', 404);
    }

    // ---------- writes ----------
    const parsed = await readJson(request);
    if (parsed.error) return parsed.error;
    const body = parsed.body;

    if (route === 'flags/save') {
      if (!can('manage_settings')) return fail('Forbidden', 403);
      const updates = body && typeof body === 'object' && body.flags && typeof body.flags === 'object' ? body.flags : { [body?.key]: body?.value };
      const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
      if (!entries.length) return fail('No flags given');
      // Allow-list: only keys that already exist as news_* rows can be written -- this can never
      // create a new arbitrary system_settings row or touch a non-newsroom setting.
      const existing = new Set(((await env.DB.prepare(`SELECT key FROM system_settings WHERE key LIKE 'news_%'`).all()).results || []).map((r) => r.key));
      for (const [key] of entries) if (!existing.has(key)) return fail(`Unknown flag: ${key}`, 400);
      for (const [key, value] of entries) {
        await env.DB.prepare(`UPDATE system_settings SET value = ? WHERE key = ?`).bind(value ? 'true' : 'false', key).run();
      }
      resetNewsFlagCache();   // takes effect immediately instead of waiting out the 30s cache
      await logAudit(env.DB, { userId: user.user_id, action: 'taxonomy_changed', entityType: 'news_flag', entityId: null, metadata: { updated: Object.fromEntries(entries.map(([k, v]) => [k, !!v])) } });
      return ok({ updated: entries.length });
    }
    if (route === 'taxonomy/save') {
      const r = await tx.saveTaxonomyItem(env.DB, body.kind, body, { actor, perms });
      if (r.ok) await invalidateNews(env);
      return fromResult(r, { slug: r.slug });
    }
    if (route === 'taxonomy/archive') {
      const r = await tx.archiveTaxonomyItem(env.DB, body.kind, body.id, { actor, perms, active: body.active === true });
      if (r.ok) await invalidateNews(env);
      return fromResult(r);
    }
    if (route === 'trust-pages/create') {
      const r = await trust.createTrustDraft(env.DB, body.slug, { actor, perms });
      return fromResult(r);
    }
    if (route === 'trust-pages/save') {
      const r = await trust.saveTrustPage(env.DB, body, { actor, perms });
      if (r.ok) await invalidateNews(env);
      return r.ok ? ok({ published: r.published }) : fail(r.error, r.status);
    }
    if (route === 'pins/save') {
      if (!can('review')) return fail('Forbidden', 403);   // editors' lead / above; grantable from the Permissions page
      const r = await stats.savePins(env.DB, body.slot, body.items, { actor });
      if (!r.ok) return fail(r.error, r.status);
      await logAudit(env.DB, { userId: user.user_id, action: 'article_updated', entityType: 'news_pins', entityId: null, metadata: { slot: body.slot, count: r.count } });
      return ok({ count: r.count });
    }
    if (route === 'search/reindex') {
      if (!can('manage_settings')) return fail('Forbidden', 403);
      const r = await search.reindexBatch(env.DB, { cursor: Number(body.cursor) || 0, limit: Number(body.limit) || 25, force: body.force === true });
      return ok(r);
    }
    if (route === 'regions/countries/save') {
      const r = await nr.setRegionCountries(env.DB, body.region_slug, body.country_codes, { actor, perms });
      if (r.ok) await invalidateNews(env);
      return r.ok ? ok({ count: r.count }) : fail(r.error, r.status);
    }
    if (route === 'authors/profile/save') return saveAuthorProfile(env, body, actor, perms);
    if (route === 'media/credit/save') return saveMediaCredit(env, body, actor, perms);

    // per-article writes: item access first (404 hides existence), then permission
    const item = await accessibleArticle(env, user, body.id, route === 'workflow/assign' || route.startsWith('corrections') ? 'read' : 'update');
    if (!item) return fail('News article not found', 404);

    if (route === 'article/meta/save') {
      if (!can('update')) return fail('Forbidden', 403);
      const before = await snapshot(env.DB, item.id);
      const meta = await tx.setArticleMeta(env.DB, item.id, body.meta || {}, { actor, perms });
      if (!meta.ok) return fromResult(meta);
      let rel = { ok: true, changed: [] };
      if (body.relations && typeof body.relations === 'object') {
        rel = await tx.setArticleRelations(env.DB, item.id, body.relations, { actor, perms });
        if (!rel.ok) return fromResult(rel); // meta already saved; relations validated-before-write so nothing partial in rel
      }
      const after = await snapshot(env.DB, item.id);
      const version = await safeRevision(env.DB, item.id, actor, before, after, body.change_summary);
      await search.reindexArticle(env.DB, item.id);   // section / entity / topic names are searchable
      await invalidateNews(env);
      return ok({ changed: [...meta.changed, ...rel.changed], revision: version });
    }
    if (route === 'sources/save') {
      const r = await nr.replaceArticleSources(env.DB, { newsId: item.id, sources: body.sources, actor, perms });
      if (r.ok) await invalidateNews(env);
      return r.ok ? ok({ count: r.count }) : fail(r.error, r.status);
    }
    if (route === 'corrections/add') {
      const r = await nr.addCorrection(env.DB, { newsId: item.id, type: body.type, message: body.public_message, actor, perms });
      if (!r.ok) return fromResult(r);
      // Keep internal workflow status in step, when the workflow is on. Best-effort.
      if (await nr.isNewsFlagEnabled(env.DB, 'news_editorial_workflow')) {
        const to = body.type === 'retraction' ? 'retracted' : body.type === 'correction' ? 'corrected' : null;
        if (to) await nr.transitionWorkflow(env.DB, { newsId: item.id, to, actor, perms }).catch(() => {});
      }
      await invalidateNews(env);
      return ok({ id: r.id });
    }
    if (route === 'timeline/add') {
      if (!can('update')) return fail('Forbidden', 403);
      const text = nr.plainText(body.body, 2000);
      if (!text) return fail('body is required');
      const cur = await env.DB.prepare(`SELECT article_type FROM news WHERE id = ?`).bind(item.id).first();
      if (cur?.article_type !== 'live') return fail('Timeline updates are only available on Live / Developing articles', 409);
      const editor = body.editor_author_id == null ? null : Number(body.editor_author_id);
      if (editor !== null && !Number.isInteger(editor)) return fail('invalid editor_author_id');
      await env.DB.prepare(`INSERT INTO news_timeline_updates (news_id, body, editor_id) VALUES (?, ?, ?)`).bind(item.id, text, editor).run();
      await logAudit(env.DB, { userId: user.user_id, action: 'article_updated', entityType: 'news', entityId: item.id, metadata: { timeline: true } });
      await invalidateNews(env);
      return ok();
    }

    // workflow endpoints: behind the feature flag
    if (route === 'workflow/transition' || route === 'workflow/assign' || route === 'factcheck/save') {
      if (!(await nr.isNewsFlagEnabled(env.DB, 'news_editorial_workflow'))) return fail('Editorial workflow is not enabled', 404);

      if (route === 'workflow/transition') {
        const r = await nr.transitionWorkflow(env.DB, { newsId: item.id, to: body.to, actor, perms, scheduledAt: body.scheduled_at });
        if (r.ok) await invalidateNews(env);
        return r.ok ? ok({ from: r.from, to: r.to }) : fail(r.error, r.status);
      }
      if (route === 'factcheck/save') {
        const r = await nr.setFactCheck(env.DB, { newsId: item.id, status: body.status, notes: body.notes, actor, perms });
        return fromResult(r);
      }
      if (route === 'workflow/assign') {
        if (!can('review')) return fail('Forbidden', 403);
        const assignee = body.assigned_to == null ? null : Number(body.assigned_to);
        if (assignee !== null) {
          const u = Number.isInteger(assignee) ? await env.DB.prepare(`SELECT id FROM users WHERE id = ?`).bind(assignee).first() : null;
          if (!u) return fail('Unknown user');
        }
        await env.DB.prepare(`INSERT OR IGNORE INTO news_editorial (news_id) VALUES (?)`).bind(item.id).run();
        await env.DB.prepare(`UPDATE news_editorial SET assigned_to = ?, assignment_notes = COALESCE(?, assignment_notes), updated_at = CURRENT_TIMESTAMP WHERE news_id = ?`)
          .bind(assignee, body.assignment_notes ? nr.plainText(body.assignment_notes, 2000) : null, item.id).run();
        await logAudit(env.DB, { userId: user.user_id, action: 'article_updated', entityType: 'news', entityId: item.id, metadata: { assigned_to: assignee } });
        return ok();
      }
    }
    return fail('Not found', 404);
  } catch (e) {
    console.error('newsroom api error:', route, e.message);
    return fail('Internal error', 500);
  }
}
