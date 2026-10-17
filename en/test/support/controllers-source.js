// Source-inspection helper: the page controllers live in worker/controllers.js (a re-export
// file) plus the modules under worker/controllers/. Tests that check how a page is built read
// them as one text.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function controllerFiles() {
  const dir = join(ROOT, 'worker/controllers');
  return ['worker/controllers.js', ...readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => `worker/controllers/${f}`)];
}

export function readControllersSource() {
  return controllerFiles().map((f) => readFileSync(join(ROOT, f), 'utf-8')).join('\n');
}
