// Guards the split of worker/newsroom-api.js (v22.61): the facade keeps the public API, parts stay small,
// no import cycle, and the shared constants and response helpers live in one place.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as facade from '../worker/newsroom-api.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'worker/newsroom-api');
const parts = readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
const read = (n) => readFileSync(join(DIR, `${n}.js`), 'utf-8');

describe('newsroom-api layout', () => {
  test('the facade exports the same 6 names as before, and nothing internal', () => {
    assert.deepEqual(Object.keys(facade).sort(), ['NEWSROOM_ROLES', 'afterNewsUpdate', 'beforeNewsUpdate', 'handleNewsroomApi', 'searchReindexHook', 'slugRedirectHook']);
  });
  test('the facade only re-exports from newsroom-api/', () => {
    const body = readFileSync(join(ROOT, 'worker/newsroom-api.js'), 'utf-8').split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'));
    assert.equal(body.length, 3);
    for (const l of body) assert.match(l, /^export \{ [A-Za-z0-9_, ]+ \} from "\.\/newsroom-api\/[a-z-]+\.js";$/);
  });
  test('four parts, imports resolve, no cycle: shared <- helpers <- hooks, dispatch', () => {
    assert.deepEqual(parts, ['dispatch', 'helpers', 'hooks', 'shared']);
    const local = { shared: [], helpers: ['shared'], hooks: ['helpers'], dispatch: ['helpers', 'shared'] };
    for (const n of parts) {
      const found = [];
      for (const m of read(n).matchAll(/from\s+"(\.\/[^"]+)"/g)) {
        assert.ok(existsSync(join(DIR, m[1])), `${n} imports missing ${m[1]}`);
        found.push(m[1].slice(2, -3));
      }
      assert.deepEqual(found.sort(), local[n].sort(), n);
    }
  });
  test('constants and response helpers are defined in shared.js only', () => {
    for (const name of ['NEWSROOM_ROLES', 'FLAG_INFO', 'QUEUE_VIEWS', 'MAX_BODY']) {
      assert.match(read('shared'), new RegExp(`(export )?const ${name} = `), name);
      for (const n of parts.filter((p) => p !== 'shared')) assert.doesNotMatch(read(n), new RegExp(`const ${name} = `), `${n} redefines ${name}`);
    }
    for (const fn of ['respond', 'ok', 'fail', 'sameOrigin', 'readJson', 'accessibleArticle']) assert.match(read('shared'), new RegExp(`(export )?(async )?function ${fn}\\b|(export )?const ${fn} = `), fn);
  });
  test('only dispatch.js declares routes; hooks and helpers never read the request path', () => {
    assert.match(read('dispatch'), /route === 'article'/);
    for (const n of ['helpers', 'hooks', 'shared']) assert.doesNotMatch(read(n), /route === /, n);
  });
  test('each part stays under 300 lines', () => { for (const n of parts) assert.ok(read(n).split('\n').length < 300, n); });
});
