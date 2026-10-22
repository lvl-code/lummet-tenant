# Newsroom admin API (worker/newsroom-api.js, worker/newsroom-api/)

`newsroom-api.js` (497 lines) is now a facade over four parts. It re-exports the same 6 names (`NEWSROOM_ROLES`, `handleNewsroomApi`, `searchReindexHook`, `slugRedirectHook`, `beforeNewsUpdate`, `afterNewsUpdate`), so `worker/api/routes/news.js` and every other importer are unchanged.

| Part | Lines | Holds |
|---|---:|---|
| `newsroom-api/shared.js` | 62 | `NEWSROOM_ROLES`, flag descriptions, queue views, body size limit; the JSON response helpers; the same-origin check; the JSON body reader; the item-access check for one article |
| `newsroom-api/dispatch.js` | 267 | `handleNewsroomApi`: path and method checks, permission lookup, every GET route, every POST route |
| `newsroom-api/helpers.js` | 103 | Article snapshot and revision recording, the article bundle, the queue listing, saving an author profile and a media credit |
| `newsroom-api/hooks.js` | 62 | The save-path hooks used by the existing news update: search reindex, slug redirect, `beforeNewsUpdate`, `afterNewsUpdate` |

Dependencies: `shared` imports only item-access; `helpers` imports `shared`; `hooks` imports `helpers`; `dispatch` imports `shared` and `helpers`. Only `dispatch.js` knows the route names. `test/newsroom-api-structure.test.js` checks this layout.
