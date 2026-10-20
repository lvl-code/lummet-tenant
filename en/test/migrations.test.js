// Guards the migrations folder (v22.39): one ordered, complete, forward-only set that builds the final schema
// and the seed data, and can be applied to a new database or to a live one without harm.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitStatements } from '../scripts/sql-statements.mjs';
import { buildExpected, compare, loadExport } from '../scripts/check-schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIG = join(ROOT, 'migrations');
const files = readdirSync(MIG).sort();
const read = (f) => readFileSync(join(MIG, f), 'utf-8');
const stmts = (f) => splitStatements(read(f));
const SCHEMA_FILES = files.filter((f) => /^00(0[1-9]|1[0-5])_/.test(f));
const SEED_FILES = files.filter((f) => /^00(1[6-9]|20)_/.test(f));
const FIXTURE = join(ROOT, 'test/fixtures/production-schema-2026-10-19.sql');

describe('migrations folder layout', () => {
  test('only numbered .sql files, contiguous from 0001, no duplicates, names the migrate workflow accepts', () => {
    assert.ok(files.every((f) => /^[0-9]{4}_[a-z0-9_]+\.sql$/.test(f)), files.join());
    files.forEach((f, i) => assert.equal(f.slice(0, 4), String(i + 1).padStart(4, '0'), `gap or duplicate at ${f}`));
    assert.equal(files.length, 20);
  });

  test('no rollback, schema.sql or other non-migration file is left in the folder', () => {
    assert.ok(!files.some((f) => /rollback|schema\.sql|backup/i.test(f)));
    assert.deepEqual(readdirSync(MIG).filter((f) => !f.endsWith('.sql')), []);
  });

  test('schema files 0001-0015 hold no data; seed files 0016-0020 create nothing', () => {
    assert.equal(SCHEMA_FILES.length, 15);
    assert.equal(SEED_FILES.length, 5);
    for (const f of SCHEMA_FILES) for (const s of stmts(f)) assert.ok(/^CREATE\b/i.test(s), `${f}: ${s.slice(0, 60)}`);
    for (const f of SEED_FILES) for (const s of stmts(f)) assert.ok(/^INSERT\b/i.test(s), `${f}: ${s.slice(0, 60)}`);
  });
});

describe('migrations are safe to run again', () => {
  test('every statement is idempotent and none rewrites or removes data', () => {
    for (const f of files) for (const s of stmts(f)) {
      assert.doesNotMatch(s, /^(ALTER|DROP|DELETE|UPDATE|REPLACE|PRAGMA|BEGIN|COMMIT)\b/i, `${f}: ${s.slice(0, 60)}`);
      if (/^CREATE\s+TABLE/i.test(s)) assert.match(s, /^CREATE TABLE IF NOT EXISTS /, f);
      else if (/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(s)) assert.match(s, /^CREATE (UNIQUE )?INDEX IF NOT EXISTS /, f);
      else if (/^CREATE\s+TRIGGER/i.test(s)) assert.match(s, /^CREATE TRIGGER IF NOT EXISTS /, f);
      else if (/^INSERT/i.test(s)) assert.ok(/^INSERT OR IGNORE INTO /.test(s) || /\bWHERE NOT EXISTS\b/i.test(s), `${f}: ${s.slice(0, 60)}`);
      else assert.fail(`${f}: unexpected statement ${s.slice(0, 60)}`);
    }
  });

  test('applying the whole folder a second time changes neither the schema nor any row', () => {
    const db = new DatabaseSync(':memory:');
    const run = () => files.forEach((f) => stmts(f).forEach((s) => db.exec(s)));
    const snap = () => JSON.stringify([db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all(), db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((t) => [t.name, db.prepare(`SELECT * FROM "${t.name}"`).all()])]);
    run(); const first = snap(); run();
    assert.equal(snap(), first);
  });

  test('applying it to a database that already has rows keeps an edited seed row', () => {
    const db = buildExpected();
    db.exec("UPDATE nav_items SET label = 'Edited' WHERE url = '/en/casino' AND location = 'header'; UPDATE system_settings SET value = 'true' WHERE key = 'news_search_v2';");
    const before = db.prepare('SELECT COUNT(*) c FROM nav_items').get().c;
    for (const f of files) for (const s of stmts(f)) db.exec(s);
    assert.equal(db.prepare('SELECT COUNT(*) c FROM nav_items').get().c, before);
    assert.equal(db.prepare("SELECT label FROM nav_items WHERE url = '/en/casino' AND location = 'header'").get().label, 'Edited');
    assert.equal(db.prepare("SELECT value FROM system_settings WHERE key = 'news_search_v2'").get().value, 'true');
  });
});

describe('what the migrations build', () => {
  const db = buildExpected();
  const names = (type) => db.prepare("SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%'").all(type).map((r) => r.name);

  test('125 tables, each defined once, no table without a home file', () => {
    const defined = SCHEMA_FILES.flatMap((f) => [...read(f).matchAll(/^CREATE TABLE IF NOT EXISTS (\w+) \(/gm)].map((m) => m[1]));
    assert.equal(defined.length, new Set(defined).size, 'a table is defined twice');
    assert.deepEqual([...defined].sort(), names('table').sort());
    assert.equal(defined.length, 125);
  });

  test('the tables that used to live outside the migrations are here', () => {
    for (const t of ['reviews', 'ai_conversations', 'ai_rate_limits', 'ai_free_tier_usage', 'ai_studio_history', 'ai_feedback', 'perf_samples', 'content_items', 'news_sections']) assert.ok(names('table').includes(t), t);
    const reviews = db.prepare('PRAGMA table_info(reviews)').all().map((c) => c.name);
    for (const c of ['author', 'author_title', 'reviewed_at', 'reviewed_content_type', 'reviewed_content_id']) assert.ok(reviews.includes(c), `reviews.${c}`);
  });

  test('the two rating triggers exist', () => assert.deepEqual(names('trigger').sort(), ['trg_casino_rating_to_reviews', 'trg_review_rating_from_casino']));

  test('the rating triggers work', () => {
    db.exec("INSERT INTO casinos (name, slug, rating, website_url, affiliate_url) VALUES ('C', 'c', 3.0, 'https://c.example', 'https://c.example/go'); INSERT INTO reviews (slug, casino_slug, title, content) VALUES ('r', 'c', 'R', 'x');");
    assert.equal(db.prepare("SELECT rating FROM reviews WHERE casino_slug = 'c'").get().rating, 3);
    db.exec("UPDATE casinos SET rating = 4.5 WHERE slug = 'c'");
    assert.equal(db.prepare("SELECT rating FROM reviews WHERE casino_slug = 'c'").get().rating, 4.5);
  });

  test('seed rows: permissions, settings, navigation, media folders, payment methods, newsroom', () => {
    const n = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
    db.exec("DELETE FROM reviews; DELETE FROM casinos;");
    assert.deepEqual(['permissions', 'system_settings', 'settings', 'nav_items', 'media_folders', 'payment_methods', 'news_sections', 'news_regions'].map(n), [189, 14, 1, 27, 7, 10, 11, 7]);
    for (const role of ['admin', 'editor', 'viewer']) assert.ok(db.prepare('SELECT COUNT(*) c FROM permissions WHERE role = ?').get(role).c > 0, role);
    assert.equal(db.prepare("SELECT value FROM system_settings WHERE key = 'news_new_taxonomy'").get().value, 'false');
  });
});

describe('the code only uses columns the schema has', () => {
  // A known problem, reported and not fixed here: worker/lummet/admin-api.js reads users.password and sessions.token,
  // columns that no database has (users.password_hash holds the PBKDF2 hash). The endpoint cannot work as written.
  const KNOWN = ['sessions.token (INSERT) in worker/lummet/admin-api.js'];

  test('INSERT column lists in the worker match real columns (apart from the known problem)', () => {
    const db = buildExpected();
    const cols = {};
    for (const r of db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table')").all()) cols[r.name] = new Set(db.prepare(`PRAGMA table_info("${r.name}")`).all().map((c) => c.name));
    const out = [];
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) scan(p); } };
    const scan = (p) => { const src = readFileSync(p, 'utf-8'); for (const m of src.matchAll(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\(([^)]*)\)/gi)) { const t = m[1]; if (!cols[t]) { out.push(`missing table ${t} in ${p.slice(ROOT.length + 1)}`); continue; } for (const c of m[2].split(',').map((x) => x.trim()).filter((x) => /^\w+$/.test(x))) if (!cols[t].has(c)) out.push(`${t}.${c} (INSERT) in ${p.slice(ROOT.length + 1)}`); } };
    walk(join(ROOT, 'worker'));
    assert.deepEqual(out, KNOWN);
  });
});

describe('scripts/check-schema.mjs and the production export', () => {
  const HAS = existsSync(FIXTURE);
  test('the export from 2026-10-19 differs from the migrations only by the three newest tables', { skip: !HAS }, () => {
    const { problems, extra } = compare(buildExpected(), loadExport(FIXTURE));
    assert.deepEqual(problems.filter((p) => /missing table/.test(p)).sort(), ['missing table ai_feedback', 'missing table ai_studio_history', 'missing table perf_samples']);
    assert.equal(problems.length, 8);
    for (const e of ['bookkeeping table _cf_KV', 'bookkeeping table d1_migrations', 'bookkeeping table tenant_migrations', 'extra table countries_backup']) assert.ok(extra.includes(e), e);
  });

  test('running the new migrations on that export brings it to the full schema, with no error', { skip: !HAS }, () => {
    const live = loadExport(FIXTURE);
    for (const f of files) for (const s of stmts(f)) live.exec(s);
    assert.deepEqual(compare(buildExpected(), live).problems, []);
  });

  test('--fix output repairs the export too', { skip: !HAS }, () => {
    const live = loadExport(FIXTURE);
    const { fixes } = compare(buildExpected(), live);
    for (const s of splitStatements(fixes.join('\n'))) live.exec(s);
    assert.deepEqual(compare(buildExpected(), live).problems, []);
  });

  test('a missing column is reported and repaired with ALTER TABLE ... ADD COLUMN', () => {
    const live = buildExpected();
    live.exec('ALTER TABLE news DROP COLUMN og_image');
    const r = compare(buildExpected(), live);
    assert.deepEqual(r.problems, ['missing column news.og_image']);
    assert.match(r.fixes[0], /^ALTER TABLE news ADD COLUMN og_image INTEGER/);
    live.exec(r.fixes[0]);
    assert.deepEqual(compare(buildExpected(), live).problems, []);
  });

  test('a column that cannot be added with ALTER is flagged for a manual step, not guessed', () => {
    const live = buildExpected();
    live.exec('ALTER TABLE casinos DROP COLUMN website_url');
    const r = compare(buildExpected(), live);
    assert.ok(r.problems.includes('missing column casinos.website_url'));
    assert.match(r.fixes.join('\n'), /needs a manual step: casinos\.website_url/);
  });
});

describe('one-time operations are kept apart from the migrations', () => {
  test('ops/ holds the three data scripts and a README that lists each', () => {
    const ops = readdirSync(join(ROOT, 'ops')).sort();
    assert.deepEqual(ops, ['README.md', 'invalidate_sessions.sql', 'platform_updates_featured_image_cleanup.sql', 'reviews_generic_backfill.sql']);
    const readme = readFileSync(join(ROOT, 'ops/README.md'), 'utf-8');
    for (const f of ops.filter((x) => x.endsWith('.sql'))) assert.ok(readme.includes(f), f);
  });
});
