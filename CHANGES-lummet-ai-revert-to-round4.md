# Lummet AI — round 8: revert to round 4 state

Per explicit request: rolled `assistant.js`, `prompt.js`, and
`retrieval.js` back to their exact content as of commit `dd28d51`
(round 4 -- "make URL guard failure-safe / fix /en/contact link"),
undoing everything rounds 5, 6, and 7 added on top. These are the only
3 files any of rounds 5-7 touched, so this is a precise revert -- no
other AI-feature files (round 1-4's, or your own unrelated commits
since) were touched.

## What this keeps (rounds 1-4, unchanged)

- Free-tier gate (3 messages, IP-hashed), register/login continuation,
  cross-subdomain cookie sharing, dedicated `lummet.` SPA parity.
- Mechanical URL-hallucination guard (`sanitizeAnswerUrls`,
  `createStreamingUrlSanitizer`) -- verified still passing against the
  same test used throughout this work.
- Author/country link bugs, `/en/contact` link bug -- both still fixed.
- Payment methods / nav items / homepage sections / category-country
  hub page retrieval additions.
- Try/catch resilience around the URL guard (round 4's fix -- a guard
  failure degrades to an unsanitized answer, not a failed request).

## What this undoes (rounds 5, 6, 7)

- The geo/licensing "strict factual limit" prompt section (round 5).
- The recency-positioned reminder for geo/licensing questions, and the
  mechanical `guardGeoFacts()` sentence-stripping guard for fabricated
  regulator names/fees/tax rates (round 6).
- **The `intent: 'licensing'` retrieval fix** (round 7) -- `isGeo` no
  longer matches `'licensing'`, and `'licensing'` is removed from the
  `casinos`/`countries`/`seo_pages` relevant-intents lists. This means
  a question the model classifies as `licensing` (rather than `geo`)
  will again fetch zero country data, the same root cause identified
  and fixed in round 7.
- **The country-detection priority fix** (round 7) -- `detectedCountry`
  reverts to trusting `plan?.country_code` (the model's own guess)
  ahead of a direct text match, reopening the path for a wrong-country
  answer if the model's classification call returns an incorrect code.

## Verified

- `node --check` clean on all 3 files.
- Re-ran the URL-guard regression test used throughout this work
  (author/country/contact links, hallucinated-URL stripping) against
  these reverted files directly -- all still pass, confirming rounds
  1-4's fixes are genuinely intact, not just assumed.
- Confirmed via `git diff` that `en/worker/api.js` was *not* touched --
  an unrelated permission-check fix (`requireRole` on `saveSettings`)
  landed in this file after round 4 and is unaffected by this revert.

## Known, explicit trade-off

This does not "fix" anything -- it's a deliberate rollback. The
licensing-intent bug and the wrong-country bug that round 7 fixed and
verified against real code paths are back. If `level.casino`'s prior
bad-looking test results turn out to have been caused by `levelcasino`
never running any of rounds 1-7 before its first `multiple.yml` deploy
(a live hypothesis raised but not yet confirmed), this revert trades
away a verified fix for two real bugs without yet having ruled that
out. Worth confirming with a fresh test before treating this as final.
