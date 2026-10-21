# Architecture: public scripts built from parts (`en/js-src/` + `scripts/build-js.mjs`)

Two public scripts are built this way: `app.js` (v22.48) and `lummet-ai.js` (v22.49).

## app.js

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

## lummet-ai.js (the chat widget)

`static/js/lummet-ai.js` (596 lines) is one function wrapper (`(function () { 'use strict'; ... })();`) whose functions share the widget state. It is built into the same single file from `js-src/lummet-ai/`. The wrapper's first lines are in `_head.js` and its last line in `_tail.js`; the numbered parts are the statements inside it, in order. Each part is checked by wrapping it in the head and tail, so a part that closes a block it did not open fails the test.

| Part | Lines | Holds |
|---|---:|---|
| `_head.js` | 7 | File comment, `(function () {`, `'use strict'` |
| `01-state.js` | 13 | Widget state, storage keys, element variables |
| `02-session-and-suggestions.js` | 47 | Session id (survives reloads and login), suggestion chips |
| `03-init.js` | 106 | `init()`: builds the widget and wires its events |
| `04-window-and-input.js` | 28 | Open, close, toggle, auto-resize, Enter key |
| `05-send-and-stream.js` | 135 | `sendMessage`, streamed answer handling |
| `06-auth-gate-and-messages.js` | 63 | Sign-in gate, remaining counter, `addMessage` |
| `07-feedback-and-follow-ups.js` | 82 | Thumbs up/down, follow-up suggestions |
| `08-typing-scroll-clear-markdown.js` | 114 | Typing indicator, scrolling, clear conversation, markdown and escaping, start |
| `_tail.js` | 1 | `})();` |

The generated file is **byte-identical** to the old one: same URL, bytes and asset version.
