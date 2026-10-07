// Visual component editor: data sources, new component types, cleaners, XSS safety.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb, applyMigrations } from './support/d1-shim.js';
import {
  cleanGridSettings, cleanTableSettings, cleanSectionSettings, cleanRichText, cleanPicks,
  cleanStudioSettingsJson, cleanLegacySettingsJson, renderStudioComponent, renderSection
} from '../worker/component-studio.js';
import { searchSource, resolvePicks, latestItems, searchLinks, isValidKey } from '../worker/component-sources.js';
import { renderComponent } from '../worker/component-engine.js';
import { Renderer } from '../worker/render.js';

let db;
before(async () => {
  const t = createTestDb();
  applyMigrations(t);
  db = t.db || t;
  await db.prepare("INSERT INTO casinos (name, slug, website_url, affiliate_url, rating, published, status) VALUES ('Alpha <b>Casino</b>','alpha','https://a.com','https://a.com/go',4.5,1,'published')").run();
  await db.prepare("INSERT INTO casinos (name, slug, website_url, affiliate_url, rating, published, status) VALUES ('Draft Casino','draft','https://d.com','https://d.com/go',3,0,'draft')").run();
});

describe('cleaners', () => {
  test('picks: invalid source/key and duplicates dropped', () => {
    const p = cleanPicks([{ source: 'casino', key: 'alpha' }, { source: 'casino', key: 'alpha' }, { source: 'evil', key: 'x' }, { source: 'casino', key: '../x' }, null]);
    assert.deepEqual(p, [{ source: 'casino', key: 'alpha' }]);
    assert.ok(isValidKey('casino', 'alpha'));
  });
  test('grid defaults and clamps', () => {
    const g = cleanGridSettings({ columns: 99, limit: -4, style: 'x', mode: 'zzz', more_url: 'javascript:alert(1)' });
    assert.equal(g.columns, 4); assert.equal(g.limit, 1); assert.equal(g.style, 'card'); assert.equal(g.mode, 'picked'); assert.equal(g.more_url, '');
  });
  test('table keeps rectangular rows', () => {
    const t = cleanTableSettings({ columns: ['A', 'B'], rows: [['1'], ['x', { t: 'y', l: 'javascript:1' }, 'extra']] });
    assert.equal(t.rows[0].length, 2); assert.equal(t.rows[1].length, 2); assert.equal(t.rows[1][1].l, undefined);
  });
  test('rich text strips scripts, handlers and bad links', () => {
    const h = cleanRichText('<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a><a href="https://ok.com/a">ok</a><img src=x onerror=alert(1)>');
    assert.ok(!/script|onclick|onerror|javascript|<img/i.test(h), h);
    assert.ok(h.includes('href="https://ok.com/a"'));
  });
  test('section drops unknown blocks and bad video', () => {
    const s = cleanSectionSettings({ blocks: [{ type: 'evil' }, { type: 'video', url: 'https://evil.com/x' }, { type: 'heading', text: 'Hi' }] });
    assert.equal(s.blocks.length, 1);
  });
  test('studio json rejects non-json and non-object', () => {
    assert.throws(() => cleanStudioSettingsJson('section', '{bad'), /valid JSON/);
    assert.throws(() => cleanStudioSettingsJson('section', '[]'), /JSON object/);
    assert.equal(JSON.parse(cleanStudioSettingsJson('section', '')).pad, 'md');
  });
  test('legacy types: link and limit only', () => {
    const j = JSON.parse(cleanLegacySettingsJson('cta', '{"link":"javascript:1","custom":"keep"}'));
    assert.equal(j.link, ''); assert.equal(j.custom, 'keep');
    assert.equal(JSON.parse(cleanLegacySettingsJson('news_feed', '{"limit":"900"}')).limit, 50);
    assert.equal(cleanLegacySettingsJson('text', '{"a":1}'), '{"a":1}');
  });
});

describe('sources', () => {
  test('search finds published only', async () => {
    const r = await searchSource(db, 'casino', { q: 'a' });
    assert.ok(r.some((x) => x.key === 'alpha'));
    assert.ok(!r.some((x) => x.key === 'draft'));
  });
  test('resolve drops missing and unpublished, keeps order', async () => {
    const r = await resolvePicks(db, [{ source: 'casino', key: 'draft' }, { source: 'casino', key: 'nope' }, { source: 'casino', key: 'alpha' }]);
    assert.deepEqual(r.map((x) => x.key), ['alpha']);
  });
  test('latest and links work', async () => {
    assert.ok((await latestItems(db, 'casino', { limit: 3 })).length >= 1);
    assert.ok(Array.isArray(await searchLinks(db, 'page', { q: '' })));
  });
});

describe('rendering', () => {
  test('grid escapes names', async () => {
    const html = await renderStudioComponent(db, { type: 'content_grid', title: 'Top', settings: { items: [{ source: 'casino', key: 'alpha' }] } });
    assert.ok(html.includes('component-grid')); assert.ok(!html.includes('<b>Casino'));
  });
  test('empty grid renders nothing', async () => {
    assert.equal(await renderStudioComponent(db, { type: 'content_grid', settings: { items: [] } }), '');
  });
  test('casino table', async () => {
    const html = await renderStudioComponent(db, { type: 'data_table', settings: { mode: 'casinos', items: [{ source: 'casino', key: 'alpha' }] } });
    assert.ok(html.includes('<table')); assert.ok(html.includes('/en/casino/alpha'));
  });
  test('manual table escapes', async () => {
    const html = await renderStudioComponent(db, { type: 'data_table', settings: { columns: ['<i>A</i>'], rows: [[{ t: '<script>x</script>' }]] } });
    assert.ok(!html.includes('<script>') && !html.includes('<i>A'));
  });
  test('section with blocks and style var safety', () => {
    const html = renderSection({ title: 'T', settings: { bg: 'color', bg_color: 'red;}</style><script>', blocks: [{ type: 'heading', text: 'H' }] } });
    assert.ok(html.includes('sec__title') && !html.includes('<script'));
  });
  test('renderComponent dispatches new types', async () => {
    const out = await renderComponent({ env: { DB: db }, loadTemplate: async () => null }, { type: 'section', title: 'X', settings: { blocks: [{ type: 'divider' }] } });
    assert.ok(out.includes('component-section'));
  });
});

import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
describe('wiring', () => {
  test('page offers the new types and the visual panel', () => {
    const page = read('templates/pages/admin/components.html');
    for (const t of ['content_grid', 'data_table', 'section']) assert.ok(page.includes(`value="${t}"`));
    assert.ok(page.includes('id="csPanel"') && page.includes('id="csSettingsGroup"'));
  });
  test('base loads the editor and the public block styles', () => {
    const base = read('templates/layout/base.html');
    assert.ok(base.includes('component-studio.js') && base.includes('component-blocks.css'));
  });
  test('editor script never writes HTML strings', () => {
    const js = read('static/js/component-studio.js');
    assert.ok(!/\.innerHTML\s*=/.test(js.replace(/tmp\.innerHTML;/g, '')), 'innerHTML assignment found');
    assert.ok(!/insertAdjacentHTML|document\.write/.test(js));
  });
  test('API wires preview, search, resolve and checks settings on save', () => {
    const api = read('worker/api.js');
    for (const s of ['/api/v1/component/preview', '/api/v1/component/pick-search', '/api/v1/component/pick-resolve']) assert.ok(api.includes(s), s);
    assert.ok(/"\/api\/v1\/component\/pick-search":\s*"components"/.test(api));
    assert.equal((api.match(/cleanComponentSettings\(body\.type/g) || []).length, 2);
  });
});

describe('older types preview', () => {
  const real = new Renderer({}, new Request('https://example.test/en'));
  const renderer = { env: {}, loadTemplate: async (n) => read(`templates/${n}`), replaceVariables: (t, d) => real.replaceVariables(t, d) };
  test('cta and text render through the real templates', async () => {
    const cta = await renderComponent(renderer, { type: 'cta', title: 'Join', content: 'Now', settings: { button_text: 'Go', link: '/en/casino' }, injection_point: 'content_top' });
    assert.ok(cta.includes('Go') && cta.includes('/en/casino'));
    const text = await renderComponent(renderer, { type: 'text', title: '', content: '<p>Hello</p>', settings: {}, injection_point: 'content_top' });
    assert.ok(text.includes('Hello'));
  });
  test('the preview route accepts the older types', () => {
    const api = read('worker/api.js');
    assert.ok(api.includes('PREVIEW_OLD') && api.includes('new Renderer(env, request)'));
  });
});

describe('shared link picker', () => {
  const lp = read('static/js/link-picker.js');
  test('is loaded before the editor and exposes the dialog', () => {
    const base = read('templates/layout/base.html');
    assert.ok(base.indexOf('link-picker.js') !== -1 && base.indexOf('link-picker.js') < base.indexOf('component-studio.js'));
    assert.ok(lp.includes('window.LummetPicker'));
  });
  test('adds a picker to the nav and homepage link fields, without HTML strings', () => {
    for (const sel of ['#navForm input[name=\\"url\\"]', '.section-button-url', '.card-url']) assert.ok(lp.includes(sel), sel);
    assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write/.test(lp));
  });
  test('those fields exist in the pages the picker targets', () => {
    assert.ok(read('templates/pages/admin/nav.html').includes('name="url"'));
    const admin = read('static/js/admin.js');
    assert.ok(admin.includes('section-button-url') && admin.includes('card-url'));
  });
});
