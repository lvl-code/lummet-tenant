// Source-inspection helper: worker/ai/retrieval.js is a facade; the code is in worker/ai/retrieval/*.js.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function readRetrievalSource() {
  const dir = join(ROOT, 'worker/ai/retrieval');
  return [join(ROOT, 'worker/ai/retrieval.js'), ...readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => join(dir, f))].map((f) => readFileSync(f, 'utf-8')).join('\n');
}
