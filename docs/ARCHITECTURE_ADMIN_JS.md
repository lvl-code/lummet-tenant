# Architecture: the admin script (`static/js/admin/`)

Since v22.16 the old `static/js/admin.js` (8,051 lines) is 27 files in `en/static/js/admin/`. They are plain classic scripts, loaded one after another by `templates/layout/base.html` in the admin-only block, exactly where `admin.js` was. Nothing else changed: the files, joined in the order below, are byte-for-byte the old file.

## Why the order matters

The scripts share one global scope, like the single file did. Functions are called from inline `onclick` handlers, top-level `const`/`let` values are used by later files, and four `DOMContentLoaded` handlers run in the order they were registered. So:

- keep the order of the `<script>` lines in `base.html` (a test checks it);
- a new file goes into `static/js/admin/` **and** into that list;
- do not add `import`/`export` (these are not modules).

## Files, in load order

| # | File | Holds | Lines |
|---|---|---|---:|
| 1 | `admin/init.js` | First DOMContentLoaded handler: starts the review, news, page, settings and research loaders | 33 |
| 2 | `admin/reviews.js` | Reviews table and review form | 136 |
| 3 | `admin/news.js` | News table, news form, image pickers | 229 |
| 4 | `admin/pages.js` | Pages table and page form | 110 |
| 5 | `admin/settings.js` | Settings form loader and compliance rows | 381 |
| 6 | `admin/homepage-builder.js` | Homepage section builder (render and collect) | 1176 |
| 7 | `admin/theme-presets.js` | Theme presets | 174 |
| 8 | `admin/settings-form.js` | Settings form submit and wiring | 676 |
| 9 | `admin/ai-generator.js` | AI review generator | 69 |
| 10 | `admin/categories.js` | Categories table and form | 167 |
| 11 | `admin/countries.js` | Countries table and form | 192 |
| 12 | `admin/research.js` | Research items table | 148 |
| 13 | `admin/research-content-builder.js` | Research content (visual section builder) and the research form | 706 |
| 14 | `admin/research-sources-claims.js` | Research sources and claims | 315 |
| 15 | `admin/research-relations.js` | Research relations | 162 |
| 16 | `admin/research-versions.js` | Research version history | 108 |
| 17 | `admin/research-review-queue.js` | Research review queue | 145 |
| 18 | `admin/research-datasets.js` | Research datasets (spreadsheet-style grid) | 368 |
| 19 | `admin/content-edit-actions.js` | Edit and delete actions for reviews, news, pages, categories, countries | 516 |
| 20 | `admin/payment-methods.js` | Payment methods | 289 |
| 21 | `admin/platform-updates.js` | Platform updates | 794 |
| 22 | `admin/html-escape.js` | escapeHtml and escapeJs | 22 |
| 23 | `admin/platform-updates-init.js` | Platform updates DOMContentLoaded handler | 25 |
| 24 | `admin/ad-rules.js` | Ad rules | 242 |
| 25 | `admin/seo-pages.js` | SEO landing pages: section builder and casino picker | 403 |
| 26 | `admin/country-pages.js` | Country pages table and form | 237 |
| 27 | `admin/category-country-pages.js` | Category + country pages, and the last DOMContentLoaded handler | 255 |

## Cache and size

Every file is served with `?v=<hash>` and cached for a year; `scripts/asset-version.mjs` now also hashes the files in sub-folders, so a changed part gets a new URL. An admin page loads 26 more script files than before (small, parallel, cached after the first visit). Public pages are not affected: these scripts are inside the admin-only block.

## Next in the restructuring

`static/js/dashboard.js` (1,995 lines), `static/js/rich-editor.js` (1,927), then `worker/index.js` routing and `worker/site-settings.js`.
