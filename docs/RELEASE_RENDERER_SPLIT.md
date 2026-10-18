# Release: template renderer split into mixins (tenant v22.27)

Built on tenant v22.26. Control plane untouched. **No migration.** `en/worker/render.js` (908 lines, one class) keeps the core of `Renderer`; 20 of its methods move to five files in `en/worker/render/`.

## Why

`Renderer` held the template loader, variable replacement, components, navigation and banners, SEO output and the page pipeline in one class. Twelfth step of the restructuring.

## What changed

- **`en/worker/render.js`**: `Renderer` with the constructor, `getSiteContext`, `loadTemplate` and `render` (the page pipeline); the same exports as before (`Renderer`, `needsAdminAssets`, `selectAssetSet`, `expandIncludes`). Every controller still imports it the same way.
- **Five mixin files in `en/worker/render/`**: `variables.js` (variable replacement), `components.js`, `navigation.js` (nav, page nav, banners), `seo.js` (escape, SEO meta, schemas), `assets.js` (asset set choice and template includes). Methods are written exactly as in a class body.
- **`en/worker/render/install-methods.js`**: defines each mixin method on `Renderer.prototype` like a class would (not enumerable, writable, configurable) and throws if a name is defined twice.
- Lazy `import()` paths inside the moved methods now start with `../` (they moved one folder deeper); a test checks that they resolve.
- `docs/ARCHITECTURE_RENDERER.md`; `docs/PLATFORM_UPGRADES.md` section 65. New `test/render-structure.test.js` (4 tests).

## Proof the behaviour is the same

- Both versions loaded side by side: the same 25 members on `Renderer.prototype` with the same descriptors, names, lengths and method source text (apart from the lazy import paths), and the same keys on an instance.
- **298 rendered pages** (anonymous and admin), old vs new: identical (status, content type, redirect target, body hash).

## Numbers

Counted with `git diff --numstat` against v22.26, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **10** | **715** | **603** |

New: 8, modified: 2, deleted: 0. Tests: **1,216 pass** (1,212 before + 4 new). Migrations: **none**.

## New files (8)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_RENDERER.md` | 25 | 0 |
| `en/test/render-structure.test.js` | 46 | 0 |
| `en/worker/render/assets.js` | 34 | 0 |
| `en/worker/render/components.js` | 56 | 0 |
| `en/worker/render/install-methods.js` | 10 | 0 |
| `en/worker/render/navigation.js` | 250 | 0 |
| `en/worker/render/seo.js` | 103 | 0 |
| `en/worker/render/variables.js` | 169 | 0 |

## Deleted files (0)

| File | + | - |
|---|---:|---:|


## Modified files (2)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 10 | 0 |
| `en/worker/render.js` | 12 | 603 |

## Install (Termux)

Needs v22.26 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node --test --test-concurrency=1 test/render-structure.test.js test/template-includes.test.js test/perf-assets.test.js 2>&1 | tail -10
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.27: template renderer split into mixins in worker/render/"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect the full suite `pass 1216`, `fail 0`.

Every page goes through this class, so after deploy open: the home page, a casino page, a news article, a dashboard page and the page navigation menu (header, footer, mobile). All should look as before.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
## Numbers

Counted with `git diff --numstat` against v22.25, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **10** | **715** | **603** |

New: 8, modified: 2, deleted: 0. Tests: **1,212 pass** (1,209 before + 3 new). Migrations: **none**.

## New files (8)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_RENDERER.md` | 25 | 0 |
| `en/test/render-structure.test.js` | 46 | 0 |
| `en/worker/render/assets.js` | 34 | 0 |
| `en/worker/render/components.js` | 56 | 0 |
| `en/worker/render/install-methods.js` | 10 | 0 |
| `en/worker/render/navigation.js` | 250 | 0 |
| `en/worker/render/seo.js` | 103 | 0 |
| `en/worker/render/variables.js` | 169 | 0 |

## Deleted files (0)

| File | + | - |
|---|---:|---:|


## Modified files (2)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 10 | 0 |
| `en/worker/render.js` | 12 | 603 |

## Install (Termux)

Needs v22.25 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node --test --test-concurrency=1 test/reports-structure.test.js test/reconciliation-imports.test.js 2>&1 | tail -10
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.26: report engine split into worker/database/reports/"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect the full suite `pass 1212`, `fail 0`.

After deploy, open Dashboard -> Reports, run one report (for example Casino performance), download its CSV, and run the Reconciliation report.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
## Numbers

Counted with `git diff --numstat` against v22.24, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **10** | **715** | **603** |

New: 8, modified: 2, deleted: 0. Tests: **1,209 pass** (1,206 before + 3 new). Migrations: **none**.

## New files (8)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_RENDERER.md` | 25 | 0 |
| `en/test/render-structure.test.js` | 46 | 0 |
| `en/worker/render/assets.js` | 34 | 0 |
| `en/worker/render/components.js` | 56 | 0 |
| `en/worker/render/install-methods.js` | 10 | 0 |
| `en/worker/render/navigation.js` | 250 | 0 |
| `en/worker/render/seo.js` | 103 | 0 |
| `en/worker/render/variables.js` | 169 | 0 |

## Deleted files (0)

| File | + | - |
|---|---:|---:|


## Modified files (2)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 10 | 0 |
| `en/worker/render.js` | 12 | 603 |

## Install (Termux)

Needs v22.24 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
```

## Test, commit, deploy

```bash
cd ~/lummet/lummet-tenant/en
node scripts/asset-version.mjs --check
node --test --test-concurrency=1 test/*.test.js 2>&1 | tail -12
cd .. && git add -A && git commit -m "Tenant v22.25: media library split into ES modules"
gh auth switch -u lvl-code && gh auth setup-git
git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
Expect `asset version is current` and the full suite `pass 1209`, `fail 0`.

After deploy, open Dashboard -> Media in a private tab: folders on the left, the grid with thumbnails, the search box, the type filter, the New Folder dialog, and an upload should all work. Also open a news article editor and use its image picker (it shares the library). Hard refresh once if the page looks empty.

## Rollback

```bash
cd ~/lummet/lummet-tenant && git revert --no-edit HEAD && git push origin main
gh workflow run multiple.yml && gh workflow run deploy-to-second.yml
```
## Numbers

Counted with `git diff --numstat` against v22.23, excluding the generated files. Moved code counts as added and deleted.

| | Files | Lines added | Lines deleted |
|---|---:|---:|---:|
| **Total** | **10** | **715** | **603** |

New: 8, modified: 2, deleted: 0. Tests: **1,206 pass** (no new tests; the admin structure test was updated). Migrations: **none**.

## New files (8)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_RENDERER.md` | 25 | 0 |
| `en/test/render-structure.test.js` | 46 | 0 |
| `en/worker/render/assets.js` | 34 | 0 |
| `en/worker/render/components.js` | 56 | 0 |
| `en/worker/render/install-methods.js` | 10 | 0 |
| `en/worker/render/navigation.js` | 250 | 0 |
| `en/worker/render/seo.js` | 103 | 0 |
| `en/worker/render/variables.js` | 169 | 0 |

## Deleted files (0)

| File | + | - |
|---|---:|---:|


## Modified files (2)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 10 | 0 |
| `en/worker/render.js` | 12 | 603 |

## Install (Termux)

Needs v22.23 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
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
| **Total** | **10** | **715** | **603** |

New: 8, modified: 2, deleted: 0. Tests: **1,206 pass** (1,199 before + 7 new). Migrations: **none**.

## New files (8)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_RENDERER.md` | 25 | 0 |
| `en/test/render-structure.test.js` | 46 | 0 |
| `en/worker/render/assets.js` | 34 | 0 |
| `en/worker/render/components.js` | 56 | 0 |
| `en/worker/render/install-methods.js` | 10 | 0 |
| `en/worker/render/navigation.js` | 250 | 0 |
| `en/worker/render/seo.js` | 103 | 0 |
| `en/worker/render/variables.js` | 169 | 0 |

## Deleted files (0)

| File | + | - |
|---|---:|---:|


## Modified files (2)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 10 | 0 |
| `en/worker/render.js` | 12 | 603 |

## Install (Termux)

Needs v22.22 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
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
| **Total** | **10** | **715** | **603** |

New: 8, modified: 2, deleted: 0. Tests: **1,199 pass** (1,196 before + 3 new). Migrations: **none**.

## New files (8)

| File | + | - |
|---|---:|---:|
| `docs/ARCHITECTURE_RENDERER.md` | 25 | 0 |
| `en/test/render-structure.test.js` | 46 | 0 |
| `en/worker/render/assets.js` | 34 | 0 |
| `en/worker/render/components.js` | 56 | 0 |
| `en/worker/render/install-methods.js` | 10 | 0 |
| `en/worker/render/navigation.js` | 250 | 0 |
| `en/worker/render/seo.js` | 103 | 0 |
| `en/worker/render/variables.js` | 169 | 0 |

## Deleted files (0)

| File | + | - |
|---|---:|---:|


## Modified files (2)

| File | + | - |
|---|---:|---:|
| `docs/PLATFORM_UPGRADES.md` | 10 | 0 |
| `en/worker/render.js` | 12 | 603 |

## Install (Termux)

Needs v22.21 applied first.

```bash
cd ~/lummet/lummet-tenant && git status --short
git apply --check ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
git apply ~/storage/downloads/lummet-tenant-v22-27-renderer-split.patch
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
