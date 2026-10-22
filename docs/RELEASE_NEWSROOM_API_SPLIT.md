# Release: newsroom admin API split into parts (tenant v22.61)

Built on tenant v22.60. Control plane untouched. **No migration. No behaviour change.** `en/worker/newsroom-api.js` (497 lines) is now a 26-line facade over `en/worker/newsroom-api/{shared,dispatch,helpers,hooks}.js`. It re-exports the same 6 names from the same path, so `worker/api/routes/news.js` and every other importer are unchanged. Docs: `docs/ARCHITECTURE_NEWSROOM_API.md`, `docs/PLATFORM_UPGRADES.md` section 99. New `test/newsroom-api-structure.test.js` (6 tests).

## Proof the behaviour is the same

- About 2,080 calls through `handleNewsroomApi` and the four hooks, old against new, on a real schema with a fixed clock and seeded randomness: every GET and POST route for seven kinds of caller, workflow off and on, valid and hostile bodies, cross-origin and malformed `Origin`, wrong content types, oversized and malformed JSON, unknown routes and methods, hooks on drafts, published and scheduled articles and a broken database. Every status and body and the content of 16 tables are identical (tied search results compared sorted by id, as their order was never fixed).
- Mutation checks on each part were all detected, except one equivalent change (pin order in a query that always returns position order).

## Numbers

Counted with `git diff --numstat` against v22.60. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **8** | **567** | **475** |

New: 6, modified: 2, deleted: 0. Tests: **1,377 pass** (1,371 before + 6). Migrations: **none**.

## New files (6)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_NEWSROOM_API.md` | 12 | 0 |
| `en/test/newsroom-api-structure.test.js` | 48 | 0 |
| `en/worker/newsroom-api/dispatch.js` | 267 | 0 |
| `en/worker/newsroom-api/helpers.js` | 103 | 0 |
| `en/worker/newsroom-api/hooks.js` | 62 | 0 |
| `en/worker/newsroom-api/shared.js` | 62 | 0 |

## Modified files (2)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 9 | 0 |
| `en/worker/newsroom-api.js` | 4 | 475 |

## Install (Termux)

Needs v22.60 applied first (and v22.59 before it).

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-61-newsroom-api-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-61-newsroom-api-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node --test --test-concurrency=1 test/newsroom-api-structure.test.js 2>&1 | tail -10
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.61: newsroom admin API split into 4 parts"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect the full suite `pass 1377`, `fail 0`.

Nothing visible changes. To confirm, open the admin newsroom page: load an article, open the queue and the search, and save a taxonomy item.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
