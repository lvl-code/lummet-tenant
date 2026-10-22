import * as permDB from '../database/permissions.js';
import * as itemAccess from '../database/item-access.js';
import { logAudit } from '../database/audit.js';
import { invalidateNews } from '../cache.js';
import * as nr from '../database/newsroom.js';
import { NEWSROOM_ROLES, QUEUE_VIEWS, fail, ok } from "./shared.js";

// ── helpers ──────────────────────────────────────────────────
export async function snapshot(db, id) {
  return await db.prepare(`SELECT ${nr.TRACKED_FIELDS.join(', ')} FROM news WHERE id = ?`).bind(id).first(); // columns from fixed constant
}

export async function safeRevision(db, newsId, actor, before, after, summary) {
  try { return await nr.recordRevision(db, { newsId, changedBy: actor.user_id, before, after, summary }); }
  catch (e) { console.error('revision failed:', e.message); return null; }
}

export async function loadBundle(db, id, perms) {
  const q = (sql, ...p) => db.prepare(sql).bind(...p).all().then(r => r.results || []);
  const [article, sources, corrections, timeline, topics, countries, entities, series, related, editorial, revisions] = await Promise.all([
    db.prepare(`SELECT id, slug, title, published, published_at, article_type, section_id, primary_country, region_slug, content_class, labels,
                       methodology, pr_provided_by, pr_original_source_url, pr_original_date, disclosure_json, updated_at
                FROM news WHERE id = ?`).bind(id).first(),
    nr.getPublicSources(db, id), nr.getPublicCorrections(db, id), nr.getPublicTimeline(db, id),
    q(`SELECT t.id, t.slug, t.name FROM news_article_topics x JOIN news_topics t ON t.id = x.topic_id WHERE x.news_id = ?`, id),
    q(`SELECT country_code, is_primary FROM news_article_countries WHERE news_id = ?`, id),
    q(`SELECT e.id, e.slug, e.name, e.entity_type, x.role FROM news_article_entities x JOIN news_entities e ON e.id = x.entity_id WHERE x.news_id = ? ORDER BY x.display_order`, id),
    q(`SELECT s.id, s.slug, s.name, x.position FROM news_series_articles x JOIN news_series s ON s.id = x.series_id WHERE x.news_id = ?`, id),
    q(`SELECT r.related_news_id AS news_id, r.relation_type, n.slug, n.title FROM news_related r JOIN news n ON n.id = r.related_news_id WHERE r.news_id = ? ORDER BY r.display_order`, id),
    nr.getEditorialState(db, id, perms),
    nr.listRevisions(db, id, perms)
  ]);
  return { article: { ...article, labels: safeParse(article?.labels, []), disclosure: safeParse(article?.disclosure_json, {}) }, sources, corrections, timeline, topics, countries, entities, series, related, editorial, revisions };
}

export const safeParse = (s, f) => { try { return s ? JSON.parse(s) : f; } catch { return f; } };

export async function listQueue(env, user, url, actor) {
  const view = url.searchParams.get('view') || 'drafts';
  if (!QUEUE_VIEWS.includes(view)) return fail('Unknown view');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const cond = {
    drafts: `n.published = 0`,
    assigned_to_me: `e.assigned_to = ?`,
    review: `e.workflow_status = 'editorial_review'`,
    factcheck: `e.workflow_status = 'fact_check'`,
    approved: `e.workflow_status = 'approved'`,
    scheduled: `n.published = 1 AND n.published_at IS NOT NULL AND datetime(n.published_at) > datetime('now')`,
    published: `n.published = 1 AND (n.published_at IS NULL OR datetime(n.published_at) <= datetime('now'))`,
    corrections: `EXISTS (SELECT 1 FROM news_corrections c WHERE c.news_id = n.id)`
  }[view]; // fixed strings only
  const params = view === 'assigned_to_me' ? [actor.user_id] : [];
  const scope = await itemAccess.getAccessibleWhereClause(env.DB, user, 'news', 'read', 'n');
  const where = [cond, scope.condition].filter(Boolean).join(' AND ');
  const r = await env.DB.prepare(`
    SELECT n.id, n.slug, n.title, n.published, n.published_at, n.updated_at, n.article_type,
           e.workflow_status, e.assigned_to, e.fact_check_status
    FROM news n LEFT JOIN news_editorial e ON e.news_id = n.id
    WHERE ${where} ORDER BY n.updated_at DESC, n.id DESC LIMIT ? OFFSET ?
  `).bind(...params, ...scope.params, limit, offset).all();
  return ok({ view, items: r.results || [] });
}

const VALID_HTTP = (v) => nr.validatePublicUrl(v);

export async function saveAuthorProfile(env, body, actor, perms) {
  if (!permDB.checkPermission(perms, 'news', 'manage_authors')) return fail('Forbidden', 403);
  const id = Number(body.id);
  if (!Number.isInteger(id)) return fail('invalid id');
  const sets = {};
  if (body.job_title !== undefined) sets.job_title = nr.plainText(body.job_title, 120) || null;
  if (body.expertise !== undefined) sets.expertise = nr.plainText(body.expertise, 500) || null;
  if (body.location !== undefined) sets.location = nr.plainText(body.location, 120) || null;
  if (body.website_url !== undefined) { const u = VALID_HTTP(body.website_url); if (!u.ok) return fail(`website_url: ${u.error}`); sets.website_url = u.value; }
  if (body.role !== undefined) {
    if (body.role !== null && !NEWSROOM_ROLES.includes(body.role)) return fail('invalid role');
    sets.role = body.role; // displayed as plain text on author pages already
  }
  const cols = Object.keys(sets);
  if (!cols.length) return fail('nothing to update');
  const r = await env.DB.prepare(`UPDATE authors SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).bind(...cols.map(c => sets[c]), id).run(); // columns from fixed set above
  if (!r.meta?.changes) return fail('Author not found', 404);
  await logAudit(env.DB, { userId: actor.user_id, action: 'author_changed', entityType: 'author', entityId: id, metadata: { fields: cols } });
  await invalidateNews(env);
  return ok();
}

export async function saveMediaCredit(env, body, actor, perms) {
  if (!permDB.checkPermission(perms, 'media', 'create')) return fail('Forbidden', 403);
  const id = Number(body.id);
  if (!Number.isInteger(id)) return fail('invalid id');
  const sets = {};
  for (const [k, max] of [['credit', 200], ['photographer', 200], ['credit_source', 300], ['license', 200], ['caption', 500], ['alt_text', 300]]) {
    if (body[k] !== undefined) sets[k] = nr.plainText(body[k], max) || null;
  }
  const cols = Object.keys(sets);
  if (!cols.length) return fail('nothing to update');
  const r = await env.DB.prepare(`UPDATE media_library SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).bind(...cols.map(c => sets[c]), id).run(); // columns from fixed list above
  if (!r.meta?.changes) return fail('Media not found', 404);
  await logAudit(env.DB, { userId: actor.user_id, action: 'article_updated', entityType: 'media', entityId: id, metadata: { credit_fields: cols } });
  return ok();
}
