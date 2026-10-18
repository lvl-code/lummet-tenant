# Architecture: stylesheets (`en/css-src/` + `scripts/build-css.mjs`)

Since v22.29 the three largest stylesheets are written as source parts and generated into the same single files as before:

| Served file (unchanged URL) | Lines | Source parts |
|---|---:|---|
| `static/css/main.css` | 2,559 | 11 in `css-src/main/` |
| `static/css/dashboard.css` | 2,069 | 8 in `css-src/dashboard/` |
| `static/css/supportive.css` | 1,948 | 7 in `css-src/supportive/` |

The browser still gets **one file per stylesheet**: no extra requests, no `@import`, no build step at deploy (the generated files are committed, like `worker/asset-version.js`). `css-src/` is outside `/static/`, so it is not served.

## Working with it

```bash
# edit a part in css-src/<name>/, then:
node scripts/build-css.mjs          # rewrites static/css/<name>.css
node scripts/asset-version.mjs      # new ?v= hash
node scripts/build-css.mjs --check  # CI/test: fails if a generated file is stale
```

- Parts are joined in file-name order, and CSS depends on order, so a rule that must win goes in a later part.
- A part starts at a top-level comment, between two rules. Keep it under about 320 lines; add a new numbered part rather than growing one (a test checks size, numbering and that the generated file matches).
- A new stylesheet that is small does not need parts; add its name to `BUNDLES` in the script only when it grows.

## Parts

### main.css

| File | Lines |
|---|---:|
| `css-src/main/01-foundation-header-hero.css` | 222 |
| `css-src/main/02-homepage-hero.css` | 116 |
| `css-src/main/03-cards-sidebar-detail-pages.css` | 242 |
| `css-src/main/04-utilities-and-patches.css` | 242 |
| `css-src/main/05-content-pages.css` | 191 |
| `css-src/main/06-footer-review-summary-faq.css` | 285 |
| `css-src/main/07-components-banners-overflow.css` | 181 |
| `css-src/main/08-sitemap.css` | 272 |
| `css-src/main/09-platform-updates.css` | 299 |
| `css-src/main/10-news-articles-responsive.css` | 201 |
| `css-src/main/11-news-cards-theme-seo-pages.css` | 308 |

### dashboard.css

| File | Lines |
|---|---:|
| `css-src/dashboard/01-admin-shell.css` | 223 |
| `css-src/dashboard/02-media-library.css` | 264 |
| `css-src/dashboard/03-media-cards.css` | 240 |
| `css-src/dashboard/04-media-picker-dark-mode.css` | 281 |
| `css-src/dashboard/05-editor-base-and-states.css` | 291 |
| `css-src/dashboard/06-editor-chrome-and-dialogs.css` | 290 |
| `css-src/dashboard/07-editor-content-responsive.css` | 246 |
| `css-src/dashboard/08-editor-dark-mode-and-forms.css` | 234 |

### supportive.css

| File | Lines |
|---|---:|
| `css-src/supportive/01-foundation-header-components.css` | 298 |
| `css-src/supportive/02-responsive-print-core-typography.css` | 261 |
| `css-src/supportive/03-content-metadata-news-cards.css` | 281 |
| `css-src/supportive/04-cards-sidebar-tables-forms-footer.css` | 285 |
| `css-src/supportive/05-mobile-contrast-links-section-rhythm.css` | 279 |
| `css-src/supportive/06-spacing-and-rhythm.css` | 285 |
| `css-src/supportive/07-forms-dashboard-mobile-spacing.css` | 259 |

## Known defect in supportive.css (not changed by the split)

Line 403 of `supportive.css` (end of `css-src/supportive/02-responsive-print-core-typography.css`) opens `@media (max-width:520px){` and never closes it. The browser therefore parses every rule after it (sections 31.1 to 32.24: core typography, readability, section spacing, forms; about 1,540 lines) **inside** that media query, so they apply only on screens 520px wide or narrower. Checked in Chromium: the last top-level rule of the sheet is that media rule with 131 nested rules.

The split keeps this exactly as it was so the release is provably identical. Closing the brace would make those rules apply on desktop and tablet too, which changes how the site looks and needs a visual check. It is planned as its own release. When it is fixed, remove the entry in `OPEN_BLOCK` in `test/css-build.test.js`.

## Next in the restructuring

Fixing the `supportive.css` brace (with before/after screenshots), then the remaining 800-line stylesheet `header-hero.css` and `responsive.css` if wanted.
