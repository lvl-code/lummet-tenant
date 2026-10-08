# Platform upgrades: research home, comparison, site search, dashboard add panel

Tenant v18. Nothing was removed or renamed. No database migration is needed. Every old
URL, API route, saved setting and template variable keeps working.

## 1. Research home (`/en/research`)

**Before:** "Featured research" showed up to 6 items and the list under it stopped at the 12
newest, so most published research was not reachable from the home page.

**Now**
- **Featured research** (editor's picks, max 6) is a separate block at the top.
- **All research** lists every published item (up to 5,000). Featured items also appear here,
  so nothing is hidden by being featured. The heading shows how many are published.
- **Sort** choice next to the filters: Newest first (default), Oldest first, Recently updated,
  Title A to Z, Title Z to A. It sorts instantly in the browser and also works from a link:
  `/en/research?sort=oldest`. Choosing Newest first removes the parameter.
- **Search and filters are unchanged.** Same box, same type/country/related filters, same
  matching on title, summary, country and related names. The "Showing X of Y" counter now counts
  each item once (featured items repeat in the full list).
- Each research type page (`/en/research/report`, ...) gets the same sort choice.

Files: `worker/controllers.js` (`renderResearchHub`, `RESEARCH_SORTS`, `sortResearchItems`),
`templates/pages/research-list.html`, `static/js/research-directory-filter.js`,
`static/css/research.css`.

## 2. Comparison pages (`/en/compare/{type}/{slug}`)

**Dashboard (Comparisons > create / edit)**
- A criterion is now **picked** from a list of what that type can be compared on instead of
  typing a key. Choosing one fills the label (still editable).
- **Add all comparable fields** adds every field in one click.
- **Custom key...** keeps the old manual entry, so existing comparisons open and save as before.
- The list comes from `GET /en/api/v1/comparison/fields?content_type=casino`.

| Type | Fields offered |
|---|---|
| Casino | rating, welcome bonus, bonus value, licence, operator, key features, accepted countries, restricted countries, website, featured |
| Sportsbook | rating, licence, licence country, website, featured, live betting, pre-match, cash out, mobile app |
| Affiliate partner | rating, licence, licence country, website, featured |
| Custom type | the common fields plus every field defined for that custom type (numbers, yes/no, lists, ratings, text, links) |

**Public page**
- A header card per item: logo, name, link, and an **Our pick** badge for the editorial pick.
- **Rating** row with stars, the number, and a **Best** marker on the highest rating.
- The criteria the editor chose come first, in the editor's order.
- **Every other field that at least one item has a value for is listed under "More details"**
  (or "Comparison details" when no criteria were saved), so the page always shows everything
  users can compare on. Empty values show a dash.
- Cells are typed: ticks and crosses for yes/no, chips for lists (first 8, then "+n"), a clean
  domain link for websites, escaped text for everything else.
- **Show differences only** hides rows where every item has the same value.
- A one-line summary names the highest rated item.
- On phones the table stays a table: the label column stays in place while items scroll
  sideways (the old stacked layout is kept for any other comparison table).

Files: `worker/comparison-fields.js` (new), `worker/controllers.js` (`renderComparison` and
helpers), `worker/api.js` (`comparison/fields`), `static/js/dashboard.js`,
`templates/pages/comparison.html`, `static/js/comparison.js` (new), `static/css/component-blocks.css`.

## 3. Site-wide search

**Before:** the header box searched casino names only (the list of casinos, in the browser).

**Now:** one box searches everything published and shows results under a title per type.

Groups: Casinos, Reviews, Research, News, Platform updates, Sportsbooks, Affiliate partners,
Authors, Pages. Only groups that have matches appear.

- Matches title, web address and for casinos the licence; research and news also match the
  summary. Titles that start with the typed words are listed first.
- Dropdown: up to 4 per group, a small logo where one exists, and
  **See all results** which opens `/en/search?q=...` (up to 20 per group, jump links to each
  group, its own search box). Pressing Enter does the same.
- Works for the desktop box and the phone search bar.
- Drafts, unpublished and future-dated content never appear. A group that fails (for example
  a table a site has not migrated) is skipped and never breaks the others.
- API: `GET /en/api/v1/public/search?q=term&limit=5` returns
  `{ query, total, groups: [{ key, label, count, items: [{ title, url, image, meta }] }] }`.
  It needs no sign-in, matches at least 2 characters, and treats `%` and `_` literally.
- `/en/search` is reserved, so no page or custom type can take that address. The results page
  is `noindex`.

Files: `worker/site-search.js` (new), `worker/api.js`, `worker/routes.js`, `worker/index.js`,
`worker/controllers.js` (`renderSiteSearch`), `templates/pages/search.html` (new),
`static/js/search.js`, `static/js/app.js` (the old phone handler steps aside),
`static/css/component-blocks.css`, `worker/breadcrumbs.js`, `worker/reserved-slugs.js`.

## 4. Dashboard: add and edit forms in a side panel

**Before:** on most dashboard pages the add form sat under a long list.

**Now:** an **+ Add ...** button sits at the top of the page. It opens the form in a panel that
slides in from the side (full screen on phones).

- The form itself is moved, not rebuilt, so every field, picker, rich editor, section builder
  and save script works exactly as before.
- **Edit** buttons fill the form and open the panel by themselves; the title changes to "Edit ...".
- **+ Add** while editing resets to a new item first (it uses the form's own Cancel button).
- A successful save closes the panel; an error keeps it open.
- Close with the cross, a click outside, or Esc. The arrows button switches between narrow and
  wide. Pickers (media, link) open above the panel.
- Pages: Affiliate accounts / partners / programs, Authors, Banners, Campaigns, Categories,
  Commercial terms, Countries, Country pages, Menu items, News, Offers, Pages, Payment methods,
  Postback integrations, Provider adapters, Reports, Research and datasets, Reviews, SEO,
  Tracking links, Platform updates, Components, Import history.
- A form can opt out with the attribute `data-no-panel`. Pages that are a single form (create
  and edit pages) are left alone, because they have no list in front of them.

Files: `static/js/admin-add-panel.js` (new), `static/css/header-hero.css`, `templates/layout/base.html`.

## Rollback

Everything is additive. Reverting the commit restores the previous behaviour; no data changes
were made.

## Tests

`test/site-upgrades.test.js` (13 tests) covers search grouping and hiding of drafts, the public
route, research sort wiring, field catalog, cell formatting, row building, the fields API, and
that every form listed for the panel exists in a template.

---

# Addendum (tenant v18.1): comparison design, custom values, top save bar

## 5. Comparison design and custom values

In the dashboard, Comparisons > create / edit has a new section **Design and custom values**.
Nothing is required: a comparison with no design looks exactly as before.

- **Whole table:** header, label column, cell, alternate-row and line colours, a highlight colour
  (the Best marker and Our pick), font (site, serif, elegant, rounded, classic, monospace),
  text size and corner shape.
- **Each item (column):** header background and text, column background and text, highlight and font.
- **Rows and custom values:** a grid with one row per criterion and one box per chosen item. A value
  typed there replaces the real value for that item only; empty keeps the real value. Each row also has
  **Row colours** (label and cell colours). **+ Add custom row** adds a new criterion with its own key
  and label, filled the same way, so a custom key and custom label get a full row of comparable values.
- Each colour has a clear button to go back to the site colour. The grid follows the items and criteria
  chosen above it.
- Order of precedence for a cell: the item's column colours, then the row's, then the whole table's.
- Safety: colours must be `#rrggbb`, fonts come from a fixed list, values are plain text (200 characters),
  everything is escaped on the page. Anything else is dropped when saved.
- Storage: one JSON document per comparison in the existing `settings` table under
  `comparison_design:{type}:{slug}` (no migration). It is removed when the comparison is deleted and when
  every design field is cleared. The comparison API (`create`, `update`, `get`) carries it as `design`.

Files: `worker/comparison-design.js` (new), `static/js/comparison-design.js` (new),
`worker/comparison-fields.js`, `worker/controllers.js`, `worker/api.js`, `static/js/dashboard.js`,
both comparison admin templates, `templates/pages/comparison.html`, `static/css/component-blocks.css`,
`static/css/header-hero.css`.

## 6. Create and edit pages: Save bar at the top

Pages that are one large form (casino, content item, generic review, comparison, landing page,
custom type, create and edit) have no list to move the form away from. They get a bar that stays at the
top while scrolling, with the page title and a **Save** button that submits the form.
