# Generic Content Engine

Evolves the Casino + Review architecture into a reusable content/review/comparison
platform supporting Casino, Sportsbook, Affiliate Partner, and Custom content types,
without changing any existing casino behavior, route, or data.

Built across 8 phases (see `CHANGES-phase*.md` in this folder for the full narrative
of each), then integrated into the `cssnight`/Research-Engine branch on 2026-09-20
(see `INTEGRATION-cssnight-merge.md`).

## Architecture at a glance

```
                    CONTENT ENGINE
                         |
          +--------------+--------------+
          |              |              |
       CASINO        SPORTSBOOK      AFFILIATE PARTNER
    (casinos table)  (content_items)  (content_items)
          |              |              |
          +--------------+--------------+
                         |
                       CUSTOM
                   (content_items,
              custom_content_types,
              custom_field_definitions/values)
                         |
              +----------+----------+
              |                     |
           REVIEWS              COMPARISONS
        (reviews table,       (comparisons,
      reviewed_content_type/  comparison_items)
      reviewed_content_id)
```

**Casino data was never migrated.** `casinos` stays exactly as it was. A new
`content_items` table holds sportsbook/affiliate_partner/custom data only. An
application-level resolver (`worker/content-resolver.js`) normalizes both into one
shape for shared rendering code, without copying casino data anywhere.

## Database (migrations `0051`, `0052`)

> Originally authored as `0045`/`0046`. Renumbered during the 2026-09-20 integration
> because the parallel Research Engine work had already claimed `0045`-`0050` on the
> branch this was merged into. See `INTEGRATION-cssnight-merge.md` for the full story.

New tables (all additive — `CREATE TABLE IF NOT EXISTS`, nothing dropped or altered
outside `reviews`):

| Table | Purpose |
|---|---|
| `content_items` | sportsbook / affiliate_partner / custom item storage |
| `content_categories`, `content_geo` | generic parallels to `casino_categories`/`geo_rules` (those two are untouched) |
| `sports`, `content_sports` | sportsbook sports coverage (normalized, not JSON) |
| `currencies`, `content_currencies` | supported currencies (normalized) |
| `content_payment_methods` | generic join onto the *existing* `payment_methods` table |
| `custom_content_types`, `custom_field_definitions`, `custom_field_values` | tenant-defined content types with typed fields |
| `comparisons`, `comparison_items` | persistent, SEO-indexable comparison pages |
| `review_criteria_templates`, `review_criteria_scores` | weighted review scoring, computed centrally (never in frontend JS) |

One non-additive change: `reviews.casino_slug` became nullable (SQLite requires a
table rebuild for that, not a plain `ALTER TABLE`), and two new nullable columns were
added: `reviewed_content_type`, `reviewed_content_id`. Every existing review was
backfilled to `reviewed_content_type = 'casino'`. Every column, index, and row ID
from the original table is preserved exactly — see the migration file's header
comment for the full reconstructed-schema paper trail, and `rollback_0052_*.sql` for
the safe-rollback procedure.

## Routes

| Type | Routes |
|---|---|
| Casino (unchanged) | `/en/casino`, `/en/casino/{slug}`, `/en/review/{slug}` |
| Sportsbook | `/en/sportsbook`, `/en/sportsbook/{slug}`, `/en/sportsbook/review/{slug}` |
| Affiliate Partner | `/en/affiliate-partner`, `/en/affiliate-partner/{slug}`, `/en/affiliate-partner/review/{slug}` |
| Custom | `/en/custom/{typeSlug}`, `/en/custom/{typeSlug}/{slug}`, `/en/custom/{typeSlug}/review/{slug}` |
| Comparisons | `/en/compare/{type}`, `/en/compare/{type}/{slug}` |

`/en/affiliate/{slug}` (the pre-existing affiliate **marketing** page) is untouched
and deliberately not reused — Affiliate Partner **content** lives under
`/en/affiliate-partner/...` specifically to avoid colliding with it.

All new routes are registered before the `FALLBACK DYNAMIC PAGE ENGINE` catch-all in
`worker/routes.js` (`/en/(.+)`, which matches multi-segment paths) — required, or
they'd be silently swallowed by the dynamic-page lookup instead.

## Content-type enablement

`worker/content-types.js` reads a `content_types_enabled` JSON value from the
existing `settings` table (seeded by migration `0051`, defaulted to
`{"casino":true,"sportsbook":false,"affiliate_partner":false,"custom":false}` on
every environment — nothing new appears anywhere until a site explicitly turns a
type on). Checked consistently at: routing, listings, sitemaps, and the admin API —
not only route resolution.

## Admin

`/en/dashboard/content-items`, `/en/dashboard/custom-types`, `/en/dashboard/comparisons`
(+ their `/create` forms), wired through the existing `renderAdminPage()` auth
pattern (role check, no new auth code) and the existing `permissions` table (new
resource strings: `content_items`, `custom_content_types`, `comparisons` — role-based
only, not yet item-level scoped like casino's admin is). API endpoints under
`/api/v1/content-item*`, `/api/v1/custom-type*`, `/api/v1/comparison*` in the shared
`worker/api.js` router. List/Get/Create/Delete only — Update was scoped out to keep
the addition reviewable; it's the natural next increment.

## Testing

`en/test/generic-content-engine*.test.js` — added to this repo's existing
`node --test` suite (`npm test`), using its own `test/support/d1-shim.js` +
`fixtures.js`. Covers: content-item CRUD, cross-type resolver normalization,
custom-type/field definitions, cross-item comparisons, weighted-rating math, and —
the most rigorous layer — real RBAC checks against the actual `handleAPI()` router
(an editor with the right permission row succeeds, a role with none gets a real 403).

A dedicated security suite (`generic-content-engine-security.test.js`) exists because
custom fields render admin-entered values as public HTML: every field type is tested
against script-tag injection, `javascript:` URLs, and attribute-breakout payloads.
One real vulnerability was found and fixed this way during development — a URL field
sanitized its scheme but not its quote characters, allowing attribute breakout — see
that test file's "regression" test for the exact payload that used to get through.

As of this integration: **238/238 tests pass** (the pre-existing 201 + 37 new),
confirmed by actually running `npm test` against the merged repository.

## What's NOT built yet

- Update/Edit for content items, custom types, or comparisons (Create/Delete only)
- Item-level (`user_item_access`) scoping for the new admin resources
- Custom-field-**value** entry UI (field *definitions* have a form; values don't)
- A proper item-search widget for the comparison builder (raw numeric ID entry today)
- Related-items caching, GEO-badge display, and analytics view-logging for the new
  content types (casino's detail controller has all three; the new ones don't yet)
- SEO landing-page generation (country+category combinations) for the new types
