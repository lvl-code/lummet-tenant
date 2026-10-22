import * as permDB from '../database/permissions.js';
import { logAudit } from '../database/audit.js';
import * as nr from '../database/newsroom.js';
import * as search from '../newsroom-search.js';
import { safeRevision, snapshot } from "./helpers.js";

// Called by the existing update handler after a successful save. Independent of
// the workflow flag: a renamed article must keep answering on its old URL.
// Keeps the search index in step with saves. Best-effort, never throws.
export async function searchReindexHook(env, slug) {
  try { return await search.reindexBySlug(env.DB, slug); } catch { return null; }
}

export async function slugRedirectHook(env, body) {
  return nr.recordSlugRedirect(env.DB, { oldSlug: body?.old_slug, newSlug: body?.slug });
}

// ── Save-path hooks for the EXISTING /api/v1/news/update ─────
// Inert unless news_editorial_workflow is on. Never throws into the save:
// on any internal error the existing behaviour proceeds unchanged.
export async function beforeNewsUpdate(env, user, body) {
  try {
    if (!(await nr.isNewsFlagEnabled(env.DB, 'news_editorial_workflow'))) return { enabled: false };
    const beforeRow = await env.DB.prepare(`SELECT id, ${nr.TRACKED_FIELDS.join(', ')} FROM news WHERE slug = ?`).bind(body.old_slug).first();
    if (!beforeRow) return { enabled: false };
    const ed = await env.DB.prepare(`SELECT workflow_status FROM news_editorial WHERE news_id = ?`).bind(beforeRow.id).first();

    // Articles that have entered the workflow (have an editorial row) may not
    // be published/unpublished through plain "update" by users lacking publish.
    // Legacy articles (no editorial row) keep today's simple publishing.
    if (ed) {
      const perms = await permDB.getPermissionsForUser(env.DB, user);
      const wouldPublish = body.published === undefined ? true : !!body.published;   // mirrors news.updateNews default
      const isPublished = beforeRow.published === 1;
      if (wouldPublish !== isPublished && !permDB.checkPermission(perms, 'news', 'publish')) {
        return { enabled: true, denied: { status: 403, error: 'Changing publication state requires the news.publish permission for articles in the editorial workflow' } };
      }
    }
    return { enabled: true, before: beforeRow };
  } catch (e) {
    console.error('newsroom beforeNewsUpdate failed (proceeding with legacy behaviour):', e.message);
    return { enabled: false };
  }
}

export async function afterNewsUpdate(env, user, body, ctx) {
  if (!ctx?.enabled || !ctx.before) return;
  try {
    const before = ctx.before;
    // Protect schedules: the legacy update writes published_at = NULL when the
    // form omits it, which would silently publish a scheduled article now.
    const wasFuture = before.published_at && Date.parse(String(before.published_at).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(before.published_at)) ? '' : 'Z')) > Date.now();
    if (wasFuture && !body.published_at) {
      await env.DB.prepare(`UPDATE news SET published_at = ? WHERE id = ?`).bind(before.published_at, before.id).run();
    }
    const after = await snapshot(env.DB, before.id);
    const version = await safeRevision(env.DB, before.id, { user_id: user.user_id }, before, after, body.change_summary);
    await logAudit(env.DB, { userId: user.user_id, action: 'article_updated', entityType: 'news', entityId: before.id, metadata: { revision: version } });
  } catch (e) {
    console.error('newsroom afterNewsUpdate failed (save already applied):', e.message);
  }
}
