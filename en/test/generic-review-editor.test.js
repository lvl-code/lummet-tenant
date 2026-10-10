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
import { renderGenericReview, renderReview, renderReviewList, renderAuthor, renderDashboardGenericReviewEdit, renderDashboardGenericReviewCreate } from '../worker/controllers.js';
import { searchSite } from '../worker/site-search.js';
import { toRichHtml, cleanSections, renderSectionsHtml, renderSections, parseSection, serializeSection, buildReviewNav, renderSectionNav } from '../worker/generic-review-sections.js';
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
  test('renderSectionsHtml escapes titles, sanitizes bodies, skips empty bodies', async () => {
    const h = await renderSectionsHtml(null, [{ title: '<i>T</i>', content: '<p>a</p><script>x</script>' }, { title: 'Empty', content: '' }]);
    assert.match(h, /<h2>&lt;i&gt;T&lt;\/i&gt;<\/h2>/);
    assert.doesNotMatch(h, /script|Empty/);
  });
  test('tables are wrapped so they scroll sideways', () => {
    assert.match(toRichHtml('<table><tr><td>a</td></tr></table>'), /<div class="table-scroll"[^>]*><table>.*<\/table><\/div>/s);
  });
  test('typed sections round-trip and are cleaned', () => {
    const faq = cleanSections([{ title: 'FAQ', type: 'faq', data: { items: [{ q: ' Q1 ', a: 'A1' }, { q: '', a: 'x' }], junk: 1 } }]).sections[0];
    assert.match(faq.content, /^lmsec:/);
    assert.deepEqual(parseSection(faq.content), { type: 'faq', data: { items: [{ q: 'Q1', a: 'A1' }], open_first: false } });
    assert.equal(serializeSection('rich', { html: '<p>x</p>' }), '<p>x</p>');           // default style stays plain HTML
    assert.match(serializeSection('rich', { html: '<p>x</p>', size: 'l' }), /^lmsec:/);
    assert.match(cleanSections([{ title: 'x', type: 'nope', data: {} }]).error, /Unknown section type/);
    assert.equal(cleanSections([{ title: '', type: 'faq', data: { items: [] } }]).sections.length, 0);
    // links are sanitized, images need an address, payment ids are numbers
    const m = parseSection(cleanSections([{ title: 'M', type: 'media', data: { images: [{ src: 'javascript:alert(1)' }, { src: '/a.png', link: 'javascript:x()' }] } }]).sections[0].content).data;
    assert.equal(m.images.length, 1); assert.equal(m.images[0].link, '');
    assert.deepEqual(parseSection(cleanSections([{ title: 'P', type: 'payments', data: { ids: [3, '3', 'x', -1, 7] } }]).sections[0].content).data.ids, [3, 7]);
  });
  test('navigation lists summary, overview, sections, pros/cons, verdict in order', () => {
    const nav = buildReviewNav({ hasScoring: true, sections: [{ id: 's1', title: 'Features' }], hasVerdict: true });
    assert.deepEqual(nav.map((n) => n.id), ['summary', 'scoring', 'overview', 's1', 'pros-cons', 'verdict']);
    assert.match(renderSectionNav(nav), /<nav class="sn-nav" data-sn[^>]*>.*href="#s1"/s);
    assert.equal(renderSectionNav([{ id: 'a', title: 'a' }]), '');
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

describe('typed sections on the public page, and one public address', () => {
  let db, env, call, sb;
  beforeEach(async () => {
    db = createTestDb(); applyMigrations(db);
    env = { DB: db, ASSETS: { fetch: async (r) => { const f = join(ROOT, new URL(r.url).pathname); return existsSync(f) ? new Response(readFileSync(f, 'utf-8')) : new Response('nf', { status: 404 }); } } };
    call = (m, p, b) => handleAPI(makeReq(m, `https://x.com${p}`, b), env, p.split('?')[0], admin);
    sb = await contentItems.createContentItem(db, 'sportsbook', { slug: 'sb', name: 'SB', status: 'published', published: true });
    await db.prepare(`INSERT OR IGNORE INTO payment_methods (slug, name, published) VALUES ('visa','Visa',1), ('skrill','Skrill',1)`).run();
    await db.prepare(`INSERT INTO casinos (slug, name, website_url, affiliate_url, published, status) VALUES ('c1','Casino One','https://c','https://c/a',1,'published')`).run();
  });
  const page = async (slug) => (await renderGenericReview(new Request('https://site.test/en/sportsbook/review/' + slug), env, 'sportsbook', slug, null)).text();

  test('FAQ, images + text, payments, picks, cards, callout, stats all render; nav lists each; FAQ gets schema', async () => {
    const pm = (await db.prepare(`SELECT id FROM payment_methods WHERE slug IN ('visa','skrill') ORDER BY slug`).all()).results.map((r) => r.id);
    const sections = [
      { title: 'Questions', type: 'faq', data: { items: [{ q: 'Is it safe?', a: 'Yes <b>very</b>' }] } },
      { title: 'Gallery', type: 'media', data: { images: [{ src: '/a.png', alt: 'A', caption: 'Cap' }, { src: '/b.png' }], text_html: '<p>After text</p>' } },
      { title: 'Pay', type: 'payments', data: { ids: pm, text_html: '<p>Fast</p>' } },
      { title: 'Related', type: 'picks', data: { items: [{ source: 'casino', key: 'c1' }, { url: '/en/about', label: 'About us' }, { source: 'casino', key: 'missing' }] } },
      { title: 'Cards', type: 'cards', data: { cards: [{ title: 'One', text: 'T', url: '/en/x', cta: 'Go' }], columns: 2 } },
      { title: 'Note', type: 'callout', data: { tone: 'warning', title: 'Careful', text: 'Read terms' } },
      { title: 'Numbers', type: 'stats', data: { items: [{ value: '24h', label: 'Payout' }] } },
    ];
    const r = await (await call('POST', '/api/v1/generic-review/create', { reviewed_content_type: 'sportsbook', reviewed_content_id: sb.id, slug: 'rv', title: 'Rv', content: '<p>Body</p>', published: true, verdict: 'Good', sections })).json();
    assert.ok(r.success, JSON.stringify(r));
    const html = await page('rv');
    assert.match(html, /<details class="rv-faq__item"><summary>Is it safe\?<\/summary>/);
    assert.match(html, /FAQPage/);
    assert.match(html, /rv-media--grid3/); assert.match(html, /<figcaption>Cap<\/figcaption>/); assert.match(html, /After text/);
    assert.match(html, /href="\/en\/payment-methods\/visa"/); assert.match(html, /href="\/en\/payment-methods\/skrill"/);
    assert.match(html, /href="\/en\/casino\/c1"/); assert.match(html, /About us/); assert.doesNotMatch(html, /missing/);
    assert.match(html, /rv-cards--outlined rv-cols-2/); assert.match(html, /rv-callout--warning/); assert.match(html, /<dd>24h<\/dd>/);
    const nav = html.match(/<nav class="sn-nav"[\s\S]*?<\/nav>/)[0];
    for (const t of ['Summary', 'Overview', 'Questions', 'Gallery', 'Pay', 'Related', 'Cards', 'Note', 'Numbers', 'Pros &amp; Cons', 'Verdict']) assert.ok(nav.includes('>' + t + '<'), t);
    assert.match(html, /id="summary"/);
    // get returns the typed data for the editor
    const g = await (await call('GET', `/api/v1/generic-review/get?id=${r.review.id}`)).json();
    assert.deepEqual(g.sections.map((x) => x.type), ['faq', 'media', 'payments', 'picks', 'cards', 'callout', 'stats']);
    assert.equal(g.sections[0].data.items[0].q, 'Is it safe?');
  });

  test('a review about a sportsbook is not reachable, listed or searchable under /en/review', async () => {
    await call('POST', '/api/v1/generic-review/create', { reviewed_content_type: 'sportsbook', reviewed_content_id: sb.id, slug: 'sb-rev', title: 'SB Review', content: '<p>x</p>', published: true });
    await db.prepare(`INSERT INTO reviews (casino_slug, slug, title, content, published) VALUES ('c1','c-rev','Casino Rev','x',1)`).run();
    const old = await renderReview(new Request('https://site.test/en/review/sb-rev'), env, 'sb-rev');
    assert.equal(old.status, 301); assert.equal(old.headers.get('Location'), '/en/sportsbook/review/sb-rev');
    assert.equal((await renderReview(new Request('https://site.test/en/review/c-rev'), env, 'c-rev')).status, 200);
    const list = await (await renderReviewList(new Request('https://site.test/en/review'), env)).text();
    assert.doesNotMatch(list, /sb-rev|SB Review/); assert.match(list, /c-rev|Casino Rev/);
    const found = await searchSite(db, 'rev');
    const urls = found.groups.flatMap((g) => g.items.map((i) => i.url));
    assert.ok(urls.includes('/en/sportsbook/review/sb-rev')); assert.ok(!urls.includes('/en/review/sb-rev')); assert.ok(urls.includes('/en/review/c-rev'));
    const pub = await (await call('GET', '/api/v1/public/reviews/list')).json();
    assert.deepEqual(pub.reviews.map((r) => r.slug), ['c-rev']);
    // an unpublished one does not redirect (so it cannot be probed)
    await db.prepare(`UPDATE reviews SET published = 0 WHERE slug = 'sb-rev'`).run();
    assert.equal((await renderReview(new Request('https://site.test/en/review/sb-rev'), env, 'sb-rev')).status, 404);
  });

  test('a casino review takes typed sections, shows them with a sticky bar, and the sync is checked', async () => {
    await db.prepare(`INSERT INTO reviews (casino_slug, slug, title, content, published, verdict) VALUES ('c1','c1-review','Casino One Review','<p>Body text</p>',1,'Solid')`).run();
    const bad = await (await call('POST', '/api/v1/review-blocks/sync', { review_slug: 'c1-review', sections: [{ title: 'X', type: 'nope', data: {} }] })).json();
    assert.ok(bad.error);
    const ok = await (await call('POST', '/api/v1/review-blocks/sync', { review_slug: 'c1-review', sections: [
      { title: 'Questions', type: 'faq', data: { items: [{ q: 'Legit?', a: 'Yes' }] } },
      { title: 'Wide', type: 'rich', data: { html: '<table><tr><td>a</td></tr></table>' } },
    ] })).json();
    assert.ok(ok.success, JSON.stringify(ok));
    const html = await (await renderReview(new Request('https://site.test/en/review/c1-review'), env, 'c1-review', null)).text();
    assert.match(html, /rv-faq__item/); assert.match(html, /FAQPage/); assert.match(html, /class="table-scroll"/);
    const nav = html.match(/<nav class="sn-nav"[\s\S]*?<\/nav>/)[0];
    for (const t of ['Summary', 'More details', 'Questions', 'Wide', 'Verdict', 'Pros &amp; Cons']) assert.ok(nav.includes('>' + t + '<'), t);
    assert.doesNotMatch(nav, /Games|Bonuses|Licensing/);
    const list = await (await call('GET', '/api/v1/review-blocks/list?review_slug=c1-review')).json();
    assert.deepEqual(list.sections.map((x) => x.type), ['faq', 'rich']);
    assert.match(read('templates/pages/admin/reviews.html'), /id="rsSections"/);
    assert.match(read('templates/layout/base.html'), /review-sections-admin\.js/);
  });
  test('author page lists everything the author published, with counts', async () => {
    const a = await db.prepare(`INSERT INTO authors (slug, name, role, published) VALUES ('ann','Ann','Editor',1) RETURNING id`).first();
    await db.prepare(`INSERT INTO reviews (casino_slug, slug, title, content, published, author_id) VALUES ('c1','c-rev','Casino Rev','x',1,?)`).bind(a.id).run();
    await call('POST', '/api/v1/generic-review/create', { reviewed_content_type: 'sportsbook', reviewed_content_id: sb.id, slug: 'sb-rev', title: 'SB Review', content: '<p>x</p>', published: true, author_id: a.id });
    await db.prepare(`INSERT INTO platform_updates (slug, title, content, published, author_id) VALUES ('u1','An Update','x',1,?)`).bind(a.id).run();
    await db.prepare(`INSERT INTO pages (slug, type, template, title, published, author_id) VALUES ('p1','static','default','A Page',1,?)`).bind(a.id).run();
    await db.prepare(`UPDATE content_items SET author_id = ? WHERE id = ?`).bind(a.id, sb.id).run();
    const html = await (await renderAuthor(new Request('https://site.test/en/author/ann'), env, 'ann')).text();
    assert.match(html, /<span class="ah-stat__n">1<\/span><span class="ah-stat__l">Casino reviews<\/span>/);
    assert.match(html, /<span class="ah-stat__l">Other reviews<\/span>/);
    assert.match(html, /href="\/en\/sportsbook\/review\/sb-rev"/); assert.match(html, /href="\/en\/review\/c-rev"/);
    assert.doesNotMatch(html, /href="\/en\/review\/sb-rev"/);
    assert.match(html, /href="\/en\/updates\/u1"/); assert.match(html, /href="\/en\/p1"/); assert.match(html, /href="\/en\/sportsbook\/sb"/);
    assert.match(html, /<nav class="sn-nav"/);
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
    assert.match(js, /RichEditor\.init/); assert.match(js, /SectionBuilder\.mount/); assert.match(js, /EntityPicker\.attach/);
    assert.match(read('static/js/section-builder.js'), /data-rich-editor/);
    assert.match(read('templates/pages/admin/reviews.html'), /name="casino_slug"[^>]*data-entity="casino"/);
    assert.match(read('static/js/rich-editor.js'), /lummetpick/);
    assert.match(read('templates/layout/base.html'), /generic-review-admin\.js/);
  });
});
