# Release: request router split (tenant v22.20)

Built on tenant v22.19. Control plane untouched. **No migration.** `en/worker/index.js` (891 lines) becomes a 57-line wrapper; the routing, the cron handler and the maintenance page move to `en/worker/app/`.

## Why

`index.js` held a 143-case routing switch, the cron handler, the maintenance page and the cache wrapper in one file. Seventh step of the restructuring (API v22.14, controllers v22.15, admin script v22.16, dashboard script v22.17, rich editor v22.18, site settings v22.19).

## What changed

- **`en/worker/index.js`**: only the outer wrapper (page cache, `server-timing`, cache bump on content writes, static headers, maintenance fallback). Same `export default { fetch, scheduled }`.
- **`en/worker/app/app-worker.js`**: Lummet subdomain, PWA manifest, static assets, then the route groups in turn, then the 404 page.
- **`en/worker/app/routes/`**: seven groups (public-pages 33 cases, listings 10, dashboard-content 36, dashboard-admin 37, services 5, sitemaps 19, misc 3) plus `index.js` (the order) and `not-handled.js`. A group returns `NOT_HANDLED` for a type it does not own.
- **`en/worker/app/scheduled.js`**: the cron work, unchanged. **`app/maintenance.js`**: the 503 page.
- `docs/ARCHITECTURE_ROUTER.md`; `docs/PLATFORM_UPGRADES.md` section 58.
- Tests: new `test/index-structure.test.js` (5 tests). Five older tests that read `index.js` as text now read the whole router through `test/support/index-source.js`.

## Proof the behaviour is the same

- Token for token: all 143 cases, the cron body, the maintenance page, the wrapper and the code before the switch are the same (only imports moved; one dynamic import path became `../site-settings.js`).
- Every route type is a case in exactly one group, so the order of the groups cannot change a result. A test checks that, and that every type `getRoute()` can return has a case.
- **298 rendered pages** (anonymous and admin), old vs new: identical (status, content type, redirect target, body hash).
- **Cron run** on a test database, old vs new: the same 11 background tasks with the same results and the same SQL statements.

## Numbers

Counted with `git diff --numstat` against v22.19, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **22** | **1137** | **844** |

New: 15, modified: 7, deleted: 0. Tests: **1,192 pass** (1,187 before + 5 new). Migrations: **none**.

## New files (15)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_ROUTER.md` | 33 | 0 |
| `en/test/index-structure.test.js` | 46 | 0 |
| `en/test/support/index-source.js` | 12 | 0 |
| `en/worker/app/app-worker.js` | 90 | 0 |
| `en/worker/app/maintenance.js` | 47 | 0 |
| `en/worker/app/routes/dashboard-admin.js` | 123 | 0 |
| `en/worker/app/routes/dashboard-content.js` | 124 | 0 |
| `en/worker/app/routes/index.js` | 18 | 0 |
| `en/worker/app/routes/listings.js` | 49 | 0 |
| `en/worker/app/routes/misc.js` | 26 | 0 |
| `en/worker/app/routes/not-handled.js` | 2 | 0 |
| `en/worker/app/routes/public-pages.js` | 240 | 0 |
| `en/worker/app/routes/services.js` | 42 | 0 |
| `en/worker/app/routes/sitemaps.js` | 154 | 0 |
| `en/worker/app/scheduled.js` | 107 | 0 |

## Deleted files (0)

| File | + | - |
|---|---:|---:|


## Modified files (7)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 10 | 0 |
| `en/test/ai-chat-report.test.js` | 2 | 1 |
| `en/test/ai-studio.test.js` | 2 | 1 |
| `en/test/header-hero.test.js` | 2 | 1 |
| `en/test/newsroom-admin-ui.test.js` | 2 | 1 |
| `en/test/site-upgrades.test.js` | 2 | 1 |
| `en/worker/index.js` | 4 | 839 |

## Install (Termux)

Needs v22.19 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-20-router-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-20-router-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node --test --test-concurrency=1 test/index-structure.test.js test/newsroom-admin-ui.test.js test/ai-studio.test.js 2>&1 | tail -10
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.20: request router split into worker/app/"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect the full suite `pass 1192`, `fail 0`. Deploy failures at "cron triggers" (code 10072) are the Free plan's limit of 5, not this release.

This file is the entry point of every request, so after deploy open: the home page, a casino page, a news article, `/sitemap.xml`, `/robots.txt`, the dashboard home and one dashboard list. All should load as before.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
