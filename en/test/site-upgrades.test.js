// Research home, comparison page, site-wide search and the admin add panel.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTestDb, applyMigrations } from './support/d1-shim.js';
import { searchSite } from '../worker/site-search.js';
import { getComparableFields, buildComparisonRows, formatCell } from '../worker/comparison-fields.js';
import { handleAPI } from '../worker/api.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
let db;
before(async () => {
  const t = createTestDb();
  applyMigrations(t);
  db = t.db || t;
  await db.prepare("INSERT INTO casinos (name, slug, website_url, affiliate_url, rating, published, status) VALUES ('Zeta Casino','zeta','https://z.com','https://z.com/go',4.2,1,'published')").run();
  await db.prepare("INSERT INTO casinos (name, slug, website_url, affiliate_url, rating, published, status) VALUES ('Zeta Hidden','zeta-hidden','https://h.com','https://h.com/go',4,0,'draft')").run();
  await db.prepare("INSERT INTO pages (slug, title, type, template, published) VALUES ('zeta-rules','Zeta rules','page','default',1)").run();
  await db.prepare("INSERT INTO research_items (type, slug, title, excerpt, content_json, published, status) VALUES ('report','zeta-report','Zeta market report','About zeta licences','{}',1,'published')").run();
  await db.prepare("INSERT INTO research_items (type, slug, title, content_json, published, status) VALUES ('report','zeta-draft','Zeta draft','{}',0,'draft')").run();
});

describe('site-wide search', () => {
  test('groups results by kind and hides unpublished content', async () => {
    const r = await searchSite(db, 'zeta');
    const keys = r.groups.map((g) => g.key);
    assert.ok(keys.includes('casino') && keys.includes('research') && keys.includes('page'), keys.join());
    const casinos = r.groups.find((g) => g.key === 'casino').items;
    assert.deepEqual(casinos.map((c) => c.title), ['Zeta Casino']);
    assert.equal(casinos[0].url, '/en/casino/zeta');
    assert.ok(!JSON.stringify(r).includes('Hidden') && !JSON.stringify(r).includes('draft'));
    assert.equal(r.total, r.groups.reduce((s, g) => s + g.items.length, 0));
  });
  test('short queries return nothing; wildcards are literal', async () => {
    assert.equal((await searchSite(db, 'z')).total, 0);
    assert.equal((await searchSite(db, '%%')).total, 0);
  });
  test('public API route answers without a user', async () => {
    const req = { method: 'GET', url: 'https://x.com/api/v1/public/search?q=zeta', headers: new Headers() };
    const res = await handleAPI(req, { DB: db }, '/api/v1/public/search', null);
    const d = await res.json();
    assert.equal(res.status, 200);
    assert.ok(d.groups.length >= 3);
  });
  test('route, page template, script and reserved slug exist', () => {
    assert.ok(read('worker/routes.js').includes('"/en/search"'));
    assert.ok(read('worker/index.js').includes('renderSiteSearch'));
    assert.ok(read('templates/pages/search.html').includes('results_html'));
    assert.ok(read('static/js/search.js').includes('/en/api/v1/public/search'));
    assert.ok(read('worker/reserved-slugs.js').includes('"search"'));
  });
});

describe('research home', () => {
  const c = read('worker/controllers.js');
  test('lists every published item with a sort choice and keeps featured separate', () => {
    assert.ok(c.includes('getPublishedResearchItems(env.DB, { limit: 5000 })'));
    assert.ok(c.includes('RESEARCH_SORTS') && c.includes('sortResearchItems'));
    const t = read('templates/pages/research-list.html');
    assert.ok(t.includes('researchSortSelect') && t.includes('researchFeaturedBlock') && t.includes('all_head_html'));
  });
  test('search and filters still read the same card attributes', () => {
    const js = read('static/js/research-directory-filter.js');
    assert.ok(js.includes('dataset.search') && js.includes('sortGrid'));
    assert.ok(c.includes('data-search="${searchBlob}"') && c.includes('data-published='));
  });
});

describe('comparison fields', () => {
  test('catalog per type, custom types add their own fields', async () => {
    const casino = await getComparableFields(db, 'casino');
    assert.ok(casino.some((f) => f.key === 'bonus_title') && casino.some((f) => f.key === 'rating'));
    const sb = await getComparableFields(db, 'sportsbook');
    assert.ok(sb.some((f) => f.key === 'live_betting' && f.kind === 'bool'));
    assert.deepEqual(await getComparableFields(db, 'nonsense'), []);
  });
  test('cells: stars, ticks, chips, links, escaping', () => {
    assert.ok(formatCell({ kind: 'rating' }, 4.5).html.includes('4.5'));
    assert.ok(formatCell({ kind: 'bool' }, 1).html.includes('cmp-yes'));
    assert.ok(formatCell({ kind: 'bool' }, 0).html.includes('cmp-no'));
    assert.ok(formatCell({ kind: 'list' }, '["MGA","UKGC"]').html.includes('UKGC'));
    assert.ok(formatCell({ kind: 'text' }, '<b>x</b>').html.includes('&lt;b&gt;'));
    assert.ok(!formatCell({ kind: 'url' }, 'javascript:alert(1)').html.includes('href='));
    assert.ok(formatCell({ kind: 'text' }, '').html.includes('cmp-na'));
  });
  test('rows: saved criteria first, remaining filled fields under more, best rating flagged', async () => {
    const fields = await getComparableFields(db, 'casino');
    const mk = (id, rating, license, bonus) => ({ contentType: 'casino', id, raw: { rating, license, bonus_title: bonus, owner: null } });
    const t = buildComparisonRows([mk(1, 4.8, 'MGA', 'A'), mk(2, 4.1, 'MGA', null)], [{ key: 'license', label: 'Licence' }], fields, {});
    assert.equal(t.main[0].label, 'Licence');
    assert.equal(t.main[0].differs, false);
    assert.ok(t.more.some((r) => r.key === 'bonus_title') && !t.more.some((r) => r.key === 'owner'));
    assert.equal(t.ratingRow.best, 0);
  });
  test('unknown saved keys still render like before', async () => {
    const t = buildComparisonRows([{ contentType: 'casino', id: 1, raw: { x: 1 } }], [{ key: 'x', label: 'X' }], await getComparableFields(db, 'casino'), {});
    assert.ok(t.main[0].cells[0].html.includes('cmp-yes'));
  });
  test('API lists fields for the dashboard picker; template and picker wired', async () => {
    const req = { method: 'GET', url: 'https://x.com/api/v1/comparison/fields?content_type=casino', headers: new Headers() };
    const res = await handleAPI(req, { DB: db }, '/api/v1/comparison/fields', { user_id: 1, role: 'admin' });
    const d = await res.json();
    assert.ok(d.success && d.fields.some((f) => f.key === 'license'));
    assert.ok(read('static/js/dashboard.js').includes('criterion-pick'));
    assert.ok(read('templates/pages/comparison.html').includes('more_rows_html'));
  });
});

describe('admin add panel', () => {
  const js = read('static/js/admin-add-panel.js');
  test('every listed form exists in a dashboard template', () => {
    const ids = [...js.matchAll(/(\w+Form):/g)].map((m) => m[1]);
    assert.ok(ids.length >= 20);
    const all = ['affiliate-accounts', 'affiliate-partners', 'affiliate-programs', 'authors', 'banners', 'campaigns', 'categories', 'commercial-terms', 'components', 'countries', 'country-pages', 'import-history', 'nav', 'news', 'offers', 'pages', 'payment-methods', 'postback-configs', 'provider-adapters', 'reports', 'research-datasets', 'research', 'reviews', 'seo', 'tracking-links', 'updates']
      .map((n) => read(`templates/pages/admin/${n}.html`)).join('\n');
    for (const id of ids) assert.ok(all.includes(`id="${id}"`), `${id} not found in a template`);
  });
  test('loaded on every page, styles scoped, nothing removed', () => {
    assert.ok(read('templates/layout/base.html').includes('/static/js/admin-add-panel.js'));
    assert.ok(read('static/css/header-hero.css').includes('.ap-panel'));
    assert.ok(js.includes('form.scrollIntoView') && js.includes('body.appendChild(form)'));
  });
});
