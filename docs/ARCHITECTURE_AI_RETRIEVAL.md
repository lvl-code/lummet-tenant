# Architecture: AI retrieval (`worker/ai/retrieval.js` + `worker/ai/retrieval/`)

Since v22.22 `worker/ai/retrieval.js` (1,230 lines) is a facade that re-exports its six public functions from 6 modules in `worker/ai/retrieval/`. `assistant.js`, `studio.js`, `preview.js`, `digest.js`, `prompt.js` and the tests keep importing `./retrieval.js`.

Public API (unchanged): `retrieve`, `buildContextString`, `extractContextUrls`, `sanitizeAnswerUrls`, `createStreamingUrlSanitizer`, `guardGeoFacts`.

## Parts

| File | Holds | Lines |
|---|---|---:|
| `retrieval/match-helpers.js` | Constants (`MAX_RESULTS`, country names, table list) and name matching: `normalizeForMatch`, `levenshtein`, `fuzzyFindCasinoSlug`, `truncate` | 85 |
| `retrieval/retrieve.js` | `retrieve`: the search itself (plan or keyword search over casinos, reviews, news, content items, research, FAQs and more) | 719 |
| `retrieval/search-helpers.js` | Small helpers `retrieve` uses: table choice, geo status, search terms, country detection, listing/geo text tests | 61 |
| `retrieval/context-string.js` | `buildContextString`: turns results into the prompt context | 207 |
| `retrieval/url-guard.js` | URL fidelity guard: `extractContextUrls`, `sanitizeAnswerUrls`, `createStreamingUrlSanitizer` | 75 |
| `retrieval/geo-guard.js` | Geo/licensing fact guard: `guardGeoFacts` | 77 |

`retrieve.js` is still one 700-line function: it was moved, not rewritten. Cutting it up is a behaviour-level refactor and should be done on its own, with tests for each query path.

Imports: `retrieve` uses `match-helpers` and `search-helpers`; `search-helpers` uses `match-helpers`; the other three parts import nothing. No cycles (a test checks it).

## Rules

- A new public function goes into the fitting part and is re-exported by name in `worker/ai/retrieval.js`.
- Keep every part under 800 lines (a test checks it).

## Next in the restructuring

The large admin template `templates/pages/admin/settings.html`, then the remaining 1,000-line files.
