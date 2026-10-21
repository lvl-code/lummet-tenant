# Architecture: public scripts built from parts (`en/js-src/` + `scripts/build-js.mjs`)

Since v22.48 `static/js/app.js` (622 lines) is written as five parts and generated into the same single file, the way the big stylesheets are (`docs/ARCHITECTURE_CSS.md`). A public page loads `app.js` once; splitting it into five script tags would add four requests to every page, and `test/perf-assets.test.js` limits the public scripts to 12.

| Part | Lines | Holds |
|---|---:|---|
| `js-src/app/01-nav-and-sidebar.js` | 153 | The page-ready start-up list, mobile nav toggle, sidebar casinos, news and categories |
| `js-src/app/02-sidebar-countries-home-news-auth.js` | 160 | Sidebar countries with search, home page news, header sign-in state |
| `js-src/app/03-mobile-search-nav-scroll-top.js` | 108 | Mobile search toggle, bottom navigation state, scroll-to-top button |
| `js-src/app/04-casino-bookmarks-init.js` | 62 | Bookmarks start-up |
| `js-src/app/05-bonus-toggle-and-bookmark-buttons.js` | 139 | Bonus row expand/collapse, bookmark buttons and toggling |

The generated file is **byte-identical** to the old one, so the URL, the bytes and the asset version are unchanged. It is a classic script: the order of the parts is the order the code runs in. Each part is whole top-level statements and is checked on its own (`test/js-build.test.js`).

```bash
node scripts/build-js.mjs          # write static/js/app.js
node scripts/build-js.mjs --check  # fail if it is out of date
node scripts/asset-version.mjs     # then refresh the asset version
```
