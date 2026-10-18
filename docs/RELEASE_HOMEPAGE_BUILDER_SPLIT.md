# Release: homepage builder script cut in three (tenant v22.24)

Built on tenant v22.23. Control plane untouched. **No migration.** `en/static/js/admin/homepage-builder.js` (1,175 lines) is deleted and replaced by three files that, joined in order, are byte-identical to it.

## What changed

- **`en/static/js/admin/homepage-builder-items.js`** (148 lines): the section list, id and escape helpers, new card, new section.
- **`en/static/js/admin/homepage-builder-render.js`** (852 lines): `renderHomepageSections`, which is one 850-line function. It was moved, not rewritten; cutting it up changes behaviour and is a separate step.
- **`en/static/js/admin/homepage-builder-collect.js`** (178 lines): `collectHomepageSections`.
- `en/templates/layout/base.html` loads the three in the old place and order; `en/worker/asset-version.js` regenerated.
- `test/admin-js-structure.test.js` has the new order. `docs/ARCHITECTURE_ADMIN_JS.md`, `docs/PLATFORM_UPGRADES.md` section 62.

## Proof the behaviour is the same

- The three files joined in order are **byte-identical** to the old file (checked by hash).
- **Headless Chromium, 59 admin pages**, old vs new: the same global functions on every page, the same list of unresolved inline handlers (none), the same console messages (apart from service-worker and stats-request noise from the test setup, which varies from run to run). Scripts per admin page: 94 to 96.

## Numbers

Counted with `git diff --numstat` against v22.23, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **9** | **1188** | **1180** |

New: 3, modified: 5, deleted: 1. Tests: **1,206 pass** (no new tests; the admin structure test was updated). Migrations: **none**.

## New files (3)

| File | + | - |
|---|---:|---:|
| `en/static/js/admin/homepage-builder-collect.js` | 177 | 0 |
| `en/static/js/admin/homepage-builder-items.js` | 144 | 0 |
| `en/static/js/admin/homepage-builder-render.js` | 854 | 0 |

## Deleted files (1)

| File | + | - |
|---|---:|---:|
| `en/static/js/admin/homepage-builder.js` | 0 | 1175 |

## Modified files (5)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_ADMIN_JS.md` | 4 | 2 |
| `docs/PLATFORM_UPGRADES.md` | 4 | 0 |
| `en/templates/layout/base.html` | 3 | 1 |
| `en/test/admin-js-structure.test.js` | 1 | 1 |
| `en/worker/asset-version.js` | 1 | 1 |

## Install (Termux)

Needs v22.23 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-24-homepage-builder-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-24-homepage-builder-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node scripts/asset-version.mjs --check
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.24: homepage builder script cut in three"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect `asset version is current` and the full suite `pass 1206`, `fail 0`.

After deploy, open Dashboard -> Settings and the homepage content section: adding a section and a card should work, and Save should keep them.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
## Numbers

Counted with `git diff --numstat` against v22.22, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **9** | **1188** | **1180** |

New: 3, modified: 5, deleted: 1. Tests: **1,206 pass** (1,199 before + 7 new). Migrations: **none**.

## New files (3)

| File | + | - |
|---|---:|---:|
| `en/static/js/admin/homepage-builder-collect.js` | 177 | 0 |
| `en/static/js/admin/homepage-builder-items.js` | 144 | 0 |
| `en/static/js/admin/homepage-builder-render.js` | 854 | 0 |

## Deleted files (1)

| File | + | - |
|---|---:|---:|
| `en/static/js/admin/homepage-builder.js` | 0 | 1175 |

## Modified files (5)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_ADMIN_JS.md` | 4 | 2 |
| `docs/PLATFORM_UPGRADES.md` | 4 | 0 |
| `en/templates/layout/base.html` | 3 | 1 |
| `en/test/admin-js-structure.test.js` | 1 | 1 |
| `en/worker/asset-version.js` | 1 | 1 |

## Install (Termux)

Needs v22.22 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-24-homepage-builder-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-24-homepage-builder-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node --test --test-concurrency=1 test/template-includes.test.js test/header-hero.test.js test/component-studio.test.js 2>&1 | tail -10
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.23: template includes, settings page split into parts"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect the full suite `pass 1206`, `fail 0`. Deploy failures at "cron triggers" (code 10072) are the Free plan's limit of 5, not this release.

After deploy, open Dashboard -> Settings: all sections should be there, the contents bar should highlight as you scroll, and Save should work.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
## Numbers

Counted with `git diff --numstat` against v22.21, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **9** | **1188** | **1180** |

New: 3, modified: 5, deleted: 1. Tests: **1,199 pass** (1,196 before + 3 new). Migrations: **none**.

## New files (3)

| File | + | - |
|---|---:|---:|
| `en/static/js/admin/homepage-builder-collect.js` | 177 | 0 |
| `en/static/js/admin/homepage-builder-items.js` | 144 | 0 |
| `en/static/js/admin/homepage-builder-render.js` | 854 | 0 |

## Deleted files (1)

| File | + | - |
|---|---:|---:|
| `en/static/js/admin/homepage-builder.js` | 0 | 1175 |

## Modified files (5)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_ADMIN_JS.md` | 4 | 2 |
| `docs/PLATFORM_UPGRADES.md` | 4 | 0 |
| `en/templates/layout/base.html` | 3 | 1 |
| `en/test/admin-js-structure.test.js` | 1 | 1 |
| `en/worker/asset-version.js` | 1 | 1 |

## Install (Termux)

Needs v22.21 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-24-homepage-builder-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-24-homepage-builder-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node --test --test-concurrency=1 test/ai-retrieval-structure.test.js test/ai-studio.test.js test/ai-feedback-fix.test.js 2>&1 | tail -10
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.22: AI retrieval split into worker/ai/retrieval/"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect the full suite `pass 1199`, `fail 0`. Deploy failures at "cron triggers" (code 10072) are the Free plan's limit of 5, not this release.

After deploy, ask the AI assistant on the site a question about a casino (and one with a country) and check the answer still names the right casinos and links.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
