// Guards the split of worker/ai/retrieval.js: the facade keeps the public API, parts stay small, no import cycle.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as facade from '../worker/ai/retrieval.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'worker/ai/retrieval');
const parts = readdirSync(DIR).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
const read = (n) => readFileSync(join(DIR, `${n}.js`), 'utf-8');

describe('ai retrieval layout', () => {
  test('the facade exports the same six functions as before', () => {
    assert.deepEqual(Object.keys(facade).sort(), ['buildContextString', 'createStreamingUrlSanitizer', 'extractContextUrls', 'guardGeoFacts', 'retrieve', 'sanitizeAnswerUrls']);
  });
  test('the facade only re-exports', () => {
    const body = readFileSync(join(ROOT, 'worker/ai/retrieval.js'), 'utf-8').split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'));
    for (const l of body) assert.match(l, /^export \{ [A-Za-z, ]+ \} from "\.\/retrieval\/[a-z-]+\.js";$/);
  });
  test('the six parts exist, none is over 800 lines, imports resolve, no cycle', () => {
    assert.deepEqual(parts, ['context-string', 'geo-guard', 'match-helpers', 'retrieve', 'search-helpers', 'url-guard']);
    const graph = {};
    for (const n of parts) {
      const s = read(n); assert.ok(s.split('\n').length < 800, `${n} too long`);
      graph[n] = [];
      for (const m of s.matchAll(/from "(\.[^"]+)"/g)) { assert.ok(existsSync(join(DIR, m[1])), `${n} imports missing ${m[1]}`); if (m[1].startsWith('./')) graph[n].push(m[1].slice(2, -3)); }
    }
    const visit = (n, stack) => { assert.ok(!stack.includes(n), `cycle ${[...stack, n].join(' > ')}`); graph[n].forEach((d) => visit(d, [...stack, n])); };
    parts.forEach((n) => visit(n, []));
  });
});
