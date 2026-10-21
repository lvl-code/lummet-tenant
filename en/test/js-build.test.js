// The public script static/js/app.js is generated from js-src/app/NN-*.js by scripts/build-js.mjs (v22.48).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { BUNDLES, buildBundle, partsOf } from '../scripts/build-js.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('script build', () => {
  test('the bundles have source folders and nothing else is in js-src', () => {
    assert.deepEqual(BUNDLES, ['app']);
    const dirs = readdirSync(join(ROOT, 'js-src'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    assert.deepEqual(dirs, [...BUNDLES].sort());
  });
  for (const name of BUNDLES) {
    test(`static/js/${name}.js is exactly the concatenation of its parts`, () => {
      assert.equal(read(`static/js/${name}.js`), buildBundle(name), 'run: node scripts/build-js.mjs');
    });
    test(`${name}: parts are numbered 01.. without gaps, small, end with a newline, and each is whole statements`, () => {
      const parts = partsOf(name);
      assert.ok(parts.length >= 3);
      parts.forEach((f, i) => assert.equal(f.slice(0, 2), String(i + 1).padStart(2, '0'), `${f} breaks the numbering`));
      assert.deepEqual(readdirSync(join(ROOT, 'js-src', name)).filter((f) => !parts.includes(f)), [], 'file with a bad name in js-src');
      for (const f of parts) {
        const s = read(`js-src/${name}/${f}`);
        assert.ok(s.trim().length > 0, `${f} empty`);
        assert.ok(s.endsWith('\n'), `${f} must end with a newline`);
        assert.ok(s.split('\n').length <= 320, `${f} is over 320 lines`);
        assert.doesNotThrow(() => new vm.Script(s, { filename: f }), `${f} does not parse on its own`);
      }
    });
  }
  test('the page still loads one app.js (the split adds no request)', () => {
    const base = read('templates/layout/base.html');
    assert.equal((base.match(/\/static\/js\/app\.js/g) || []).length, 1);
    assert.ok(!/\/static\/js\/app-/.test(base));
  });
  test('the build script --check passes and the asset version is current', () => {
    for (const script of ['build-js.mjs', 'build-css.mjs', 'asset-version.mjs']) {
      const r = spawnSync(process.execPath, [join(ROOT, 'scripts', script), '--check'], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
    }
  });
});
