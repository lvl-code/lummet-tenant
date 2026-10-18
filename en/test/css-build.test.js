// The big stylesheets are generated from css-src/<name>/NN-*.css by scripts/build-css.mjs (v22.29).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { BUNDLES, buildBundle, partsOf } from '../scripts/build-css.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Net { } depth of a CSS text, ignoring comments.
function netDepth(css) {
  let d = 0; let c = false;
  for (let i = 0; i < css.length; i++) {
    const a = css[i]; const b = css[i + 1];
    if (c) { if (a === '*' && b === '/') { c = false; i++; } } else if (a === '/' && b === '*') { c = true; i++; } else if (a === '{') d++; else if (a === '}') d--;
  }
  return d;
}

// supportive.css has a known pre-existing defect: the `@media (max-width:520px){` that ends part 02 is never closed, so
// every later part is parsed inside it. Parts 03-07 are balanced relative to that open block. Fixing it is a separate,
// visible change (see docs/ARCHITECTURE_CSS.md); when it is fixed, remove this entry.
const OPEN_BLOCK = { 'supportive/02-responsive-print-core-typography.css': 1 };

describe('stylesheet build', () => {
  test('the three bundles have source folders and nothing else is in css-src', () => {
    assert.deepEqual(BUNDLES, ['main', 'dashboard', 'supportive']);
    const dirs = readdirSync(join(ROOT, 'css-src'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    assert.deepEqual(dirs, [...BUNDLES].sort());
  });
  for (const name of BUNDLES) {
    test(`static/css/${name}.css is exactly the concatenation of its parts`, () => {
      assert.equal(read(`static/css/${name}.css`), buildBundle(name), `run: node scripts/build-css.mjs`);
    });
    test(`${name}: parts are numbered 01.. without gaps, small, and end with a newline`, () => {
      const parts = partsOf(name);
      assert.ok(parts.length >= 3);
      parts.forEach((f, i) => assert.equal(f.slice(0, 2), String(i + 1).padStart(2, '0'), `${f} breaks the numbering`));
      assert.deepEqual(readdirSync(join(ROOT, 'css-src', name)).filter((f) => !parts.includes(f)), [], 'file with a bad name in css-src');
      for (const f of parts) {
        const s = read(`css-src/${name}/${f}`);
        assert.ok(s.trim().length > 0, `${f} empty`);
        assert.ok(s.endsWith('\n'), `${f} must end with a newline`);
        assert.ok(s.split('\n').length <= 320, `${f} is over 320 lines`);
      }
    });
    test(`${name}: every part is brace-balanced (known exceptions listed)`, () => {
      for (const f of partsOf(name)) assert.equal(netDepth(read(`css-src/${name}/${f}`)), OPEN_BLOCK[`${name}/${f}`] || 0, `${name}/${f}`);
    });
  }
  test('the build script --check passes and the asset version is current', () => {
    for (const script of ['build-css.mjs', 'asset-version.mjs']) {
      const r = spawnSync(process.execPath, [join(ROOT, 'scripts', script), '--check'], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
    }
  });
});
