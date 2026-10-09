// v18.4: generic reviews -- rich body, real sections, one dashboard route.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestDb, applyMigrations } from './support/d1-shim.js';
import * as contentItems from '../worker/database/content-items.js';
import * as genericReviews from '../worker/database/generic-reviews.js';
import { handleAPI } from '../worker/api.js';
import { renderGenericReview, renderDashboardGenericReviewEdit, renderDashboardGenericReviewCreate } from '../worker/controllers.js';
import { toRichHtml, cleanSections, renderSectionsHtml } from '../worker/generic-review-sections.js';
import { getRoute } from '../worker/routes.js';
const route = (p) => getRoute(new Request('https://site.test' + p));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');
const makeReq = (method, url, body) => ({ method, url, headers: new Headers(), json: async () => body });
const admin = { user_id: 1, role: 'admin', email: 'a@test.com' };

describe('sections helpers', () => {
  test('plain text becomes paragraphs, HTML is sanitized', () => {
    assert.equal(toRichHtml('One\nline\n\nTwo & more'), '<p>One<br>line</p>\n<p>Two &amp; more</p>');
    const out = toRichHtml('<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>');
    assert.doesNotMatch(out, /script|onerror/i);
    assert.match(out, /<p>ok<\/p>/);
  });
  test('cleanSections drops empties, requires titles, caps count and length', () => {
    assert.deepEqual(cleanSections([{ title: '', content: '<p>&nbsp;</p>' }, { title: ' A ', content: '<p>x</p>' }]).sections, [{ title: 'A', content: '<p>x</p>' }]);
    assert.match(cleanSections([{ title: '', content: '<p>text</p>' }]).error, /title/);
    assert.match(cleanSections(Array.from({ length: 31 }, (_, i) => ({ title: 't' + i, content: 'x' }))).error, /at most 30/);
    assert.match(cleanSections([{ title: 'x'.repeat(121), content: 'x' }]).error, /120/);
    assert.ok(cleanSections('nope').error);
  });
  test('renderSectionsHtml escapes titles, sanitizes bodies, skips empty bodies', () => {
    const h = renderSectionsHtml([{ title: '<i>T</i>', content: '<p>a</p><script>x</script>' }, { title: 'Empty', content: '' }]);
    assert.match(h, /<h2>&lt;i&gt;T&lt;\/i&gt;<\/h2>/);
    assert.doesNotMatch(h, /script|Empty/);
  });
});

describe('API + public page', () => {
  let db, env, call, sb;
  beforeEach(async () => {
    db = createTestDb(); applyMigrations(db);
    env = { DB: db, ASSETS: { fetch: async (r) => { const f = join(ROOT, new URL(r.url).pathname); return existsSync(f) ? new Response(readFileSync(f, 'utf-8')) : new Response('nf', { status: 404 }); } } };
    call = (m, p, b) => handleAPI(makeReq(m, `https://x.com${p}`, b), env, p.split('?')[0], admin);
    sb = await contentItems.createContentItem(db, 'sportsbook', { slug: 'sb', name: 'SB', status: 'published', published: true });
  });
  const create = (extra = {}) => call('POST', '/api/v1/generic-review/create', { reviewed_content_type: 'sportsbook', reviewed_content_id: sb.id, slug: 'rv', title: 'Rv', content: '<p>Body</p>', published: true, ...extra });

  test('create saves sections; get returns them in order; update replaces them', async () => {
    const r = await (await create({ sections: [{ title: 'Features', content: '<p>F</p>' }, { title: 'Payments', content: '<p>P</p>' }] })).json();
    assert.ok(r.success);
    let g = await (await call('GET', `/api/v1/generic-review/get?id=${r.review.id}`)).json();
    assert.deepEqual(g.sections.map((s) => s.title), ['Features', 'Payments']);
    await call('POST', '/api/v1/generic-review/update', { id: r.review.id, sections: [{ title: 'Payments', content: '<p>P</p>' }] });
    g = await (await call('GET', `/api/v1/generic-review/get?id=${r.review.id}`)).json();
    assert.deepEqual(g.sections.map((s) => s.title), ['Payments']);
    // update without `sections` leaves them alone
    await call('POST', '/api/v1/generic-review/update', { id: r.review.id, title: 'New' });
    g = await (await call('GET', `/api/v1/generic-review/get?id=${r.review.id}`)).json();
    assert.equal(g.sections.length, 1);
  });

  test('validation: empty body, bad slug, duplicate slug, bad sections', async () => {
    assert.equal((await create({ content: '<p>&nbsp;</p>' })).status, 400);
    assert.equal((await create({ slug: 'Bad Slug' })).status, 400);
    assert.ok((await (await create()).json()).success);
    const dup = await create();
    assert.equal(dup.status, 400);
    assert.match((await dup.json()).error, /already exists/);
    assert.equal((await create({ slug: 'x2', sections: [{ title: '', content: '<p>t</p>' }] })).status, 400);
  });

  test('deleting a review removes its sections (no leftovers for a reused slug)', async () => {
    const r = await (await create({ sections: [{ title: 'A', content: '<p>a</p>' }] })).json();
    await call('POST', '/api/v1/generic-review/delete', { id: r.review.id });
    assert.equal((await db.prepare(`SELECT COUNT(*) n FROM review_blocks WHERE review_slug='rv'`).first()).n, 0);
  });

  test('public page shows sections after the overview; rich body is sanitized; old plain text still reads', async () => {
    await create({ content: '<p>Rich</p><script>bad()</script>', sections: [{ title: 'Features', content: '<p>Fast payouts</p>' }] });
    let html = await (await renderGenericReview(new Request('https://site.test/en/sportsbook/review/rv'), env, 'sportsbook', 'rv', null)).text();
    assert.match(html, /<h2>Features<\/h2>/);
    assert.match(html, /Fast payouts/);
    assert.ok(html.indexOf('id="overview"') < html.indexOf('Fast payouts'));
    assert.doesNotMatch(html, /bad\(\)/);
    await genericReviews.updateGenericReview(db, (await db.prepare(`SELECT id FROM reviews WHERE slug='rv'`).first()).id, { content: 'Line one\n\nLine two' });
    html = await (await renderGenericReview(new Request('https://site.test/en/sportsbook/review/rv'), env, 'sportsbook', 'rv', null)).text();
    assert.match(html, /<p>Line one<\/p>\n<p>Line two<\/p>/);
  });
});

describe('one dashboard route', () => {
  test('old add and edit addresses redirect to the single screen', async () => {
    const e = await renderDashboardGenericReviewEdit(new Request('https://site.test/en/dashboard/generic-review/edit/5'), {}, 5);
    assert.equal(e.status, 302); assert.equal(e.headers.get('Location'), '/en/dashboard/reviews/generic?edit=5');
    const c = await renderDashboardGenericReviewCreate(new Request('https://site.test/en/dashboard/review/generic/create?type=custom'), {});
    assert.equal(c.status, 302); assert.equal(c.headers.get('Location'), '/en/dashboard/reviews/generic?type=custom&new=1');
  });
  test('routes still resolve; the screen holds list, editor, rich body and sections', () => {
    assert.equal(route('/en/dashboard/reviews/generic').type, 'dashboardGenericReviews');
    assert.equal(route('/en/dashboard/generic-review/edit/5').id, 5);
    const t = read('templates/pages/admin/generic-reviews.html');
    for (const id of ['grListView', 'grEditView', 'grForm', 'grContent', 'grSections', 'grPresets']) assert.match(t, new RegExp(`id="${id}"`));
    const js = read('static/js/generic-review-admin.js');
    assert.match(js, /data-rich-editor/); assert.match(js, /RichEditor\.init/);
    assert.match(read('static/js/rich-editor.js'), /lummetpick/);
    assert.match(read('templates/layout/base.html'), /generic-review-admin\.js/);
  });
});
