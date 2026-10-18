// Guards the split of the admin script: the files, their load order, and that together
// they still define what the admin pages call.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminScriptNames } from './support/admin-js-source.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

// The order is the order the code had in the single file. Listeners and top-level
// declarations depend on it, so changing it needs a reason.
const ORDER = ['init', 'reviews', 'news', 'pages', 'settings', 'homepage-builder-items', 'homepage-builder-render', 'homepage-builder-collect', 'theme-presets', 'settings-form', 'ai-generator',
  'categories', 'countries', 'research', 'research-content-builder', 'research-sources-claims', 'research-relations', 'research-versions',
  'research-review-queue', 'research-datasets', 'content-edit-actions', 'payment-methods', 'platform-updates', 'html-escape',
  'platform-updates-init', 'ad-rules', 'seo-pages', 'country-pages', 'category-country-pages'];

describe('admin script layout', () => {
  test('the old single file is gone and base.html loads the parts in the fixed order', () => {
    assert.ok(!existsSync(join(ROOT, 'static/js/admin.js')));
    assert.ok(!read('templates/layout/base.html').includes('/static/js/admin.js'));
    assert.deepEqual(adminScriptNames(), ORDER);
  });

  test('every file in static/js/admin/ is loaded, and every loaded file exists', () => {
    const onDisk = readdirSync(join(ROOT, 'static/js/admin')).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
    assert.deepEqual([...ORDER].sort(), onDisk);
  });

  test('the parts load after media-picker.js and before casino-admin.js, inside the admin-only block', () => {
    const base = read('templates/layout/base.html');
    const first = base.indexOf('/static/js/admin/init.js');
    const last = base.indexOf('/static/js/admin/category-country-pages.js');
    assert.ok(base.indexOf('/static/js/media-picker.js') < first);
    assert.ok(last < base.indexOf('/static/js/casino-admin.js'));
    const open = base.lastIndexOf('<!--@full-->', first);
    assert.ok(open > -1 && base.indexOf('<!--@/full-->', last) > last && base.indexOf('<!--@/full-->', open) > last, 'inside a @full block');
  });

  test('parts are plain scripts (no import/export) that stay under 1,200 lines', () => {
    for (const n of ORDER) {
      const text = read(`static/js/admin/${n}.js`);
      assert.ok(!/^\s*(import|export)\s/m.test(text), n);
      assert.ok(text.split('\n').length <= 1200, `${n}: ${text.split('\n').length} lines`);
      new vm.Script(text, { filename: `${n}.js` });
    }
  });

  test('loaded one after the other like the browser does, they define the same functions and listeners', () => {
    const listeners = [];
    const noop = () => null;
    const document = { addEventListener: (type, fn) => listeners.push({ type, fn }), getElementById: noop, querySelector: noop, querySelectorAll: () => [] };
    const ctx = vm.createContext({ document, window: {}, console, fetch: noop, setTimeout, clearTimeout, navigator: {}, location: { href: 'https://x.test/en/dashboard' }, localStorage: {} });
    for (const n of ORDER) vm.runInContext(read(`static/js/admin/${n}.js`), ctx, { filename: `${n}.js` });
    const defined = vm.runInContext('typeof loadReviewsTable + typeof editReview + typeof escapeHtml + typeof renderHomepageSections + typeof saveAdRule + typeof initCategoryCountryForm + typeof SITE_THEME_PRESETS', ctx);
    assert.equal(defined, 'function'.repeat(6) + 'object');
    assert.equal(listeners.length, 4, 'DOMContentLoaded listeners registered by the admin script');
    assert.ok(listeners.every((l) => l.type === 'DOMContentLoaded'));
    const all = ORDER.map((n) => read(`static/js/admin/${n}.js`)).join('');
    assert.equal((all.match(/^(?:async\s+)?function\s+\w+/gm) || []).length, 202, 'top-level functions in the original single file');
  });
});
