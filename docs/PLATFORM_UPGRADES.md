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

---

# Addendum (tenant v18.2): comparison sections, related fields, remove item, list search

Nothing from v18 and v18.1 changed; all of this is added on top.

## 7. Comparison: content sections below the table

Comparisons > create / edit > **Design and custom values** has a new part,
**Content sections below the table**. It builds written content, shown under the table in the order set:
heading, text (blank line = new paragraph), list (bullets or numbers), highlighted note (information,
positive, warning), **picked items**, button / link, picture, divider line. No tables.
- **Picked items** open the same search dialog used elsewhere: casinos, news, research, authors, platform
  updates, sportsbooks, affiliate partners and custom content (up to 12 per block). They appear as text rows
  with a small picture, title, type, rating and summary. Unpublished or deleted items drop out by themselves.
- **Button / link** has a "Pick a page" button (pages, reviews, and the same content types); pictures have
  "Choose from Media".
- Up to 30 blocks. Text is plain and escaped on the page; links must start with `/` or `https://`.
- Stored in the comparison's design document (`sections`), so it needs no migration.

## 8. Comparison table: payment methods and categories

**Payment methods** and **Categories** are now comparable fields for every type, picked like any other
criterion (or shown automatically under "More details" when at least one item has them). They show what
each item is linked to on the site: casinos through their payment-method and category links, other types
through the generic content links. An item with none shows a dash.

## 9. Comparison page: remove an item

Each item header has a small **x**. It hides that column for the visit; **Restore ...** brings it back.
At least two items always stay. (In the dashboard, items are removed with the x next to each chosen item.)

## 10. Dashboard: search in every list

Every table in the dashboard (and the card lists of Inquiries and Submissions) gets, as soon as it has a row:
- a **search box** (all words must match anywhere in the row, ignoring the Edit/Delete buttons),
- a **"Showing X of Y"** count and a clear "No rows match" line,
- **click a heading to sort** (numbers sort as numbers),
- **/** jumps to the search box, **Esc** clears it.
Lists that load later or reload after a save keep working. Comparisons and generic reviews, which load one
page at a time, send the search to the server (`search=` on `comparisons/list` and `generic-reviews/list`),
so it covers every page. The content items list keeps its own search. A table can opt out with `data-no-search`.

Files: `static/js/admin-list-search.js` (new), `static/css/header-hero.css`, `static/js/dashboard.js`,
`worker/database/comparisons.js`, `worker/database/generic-reviews.js`, `worker/api.js`,
`worker/comparison-design.js`, `worker/comparison-fields.js`, `worker/controllers.js`,
`static/js/comparison-design.js`, `static/js/comparison.js`, `static/css/component-blocks.css`,
`templates/pages/comparison.html`, `templates/layout/base.html`.

## 11. Reviews for generic content: one screen, rich editor, real sections (v18.4)

Applies to reviews of sportsbooks, affiliate partners and custom content (casino reviews are untouched).

- **One route.** `/en/dashboard/reviews/generic` is the only screen: the list, `?new=1` (add) and `?edit=ID` (edit). Moving between them never reloads the page and the address follows the view, so back/forward and bookmarks work. The old addresses (`/en/dashboard/review/generic/create`, `/en/dashboard/generic-review/edit/ID`) still work and redirect here. Their templates stay in the repo, unused.
- **Rich editor for Content.** The review body uses the same editor as news and pages. Reviews written before this change as plain text are shown as paragraphs, in the editor and on the public page.
- **Sections that actually show.** Sections were saved by the old edit page but the public review page never printed them. They now appear after the Overview, in order, each with its own title and the full editor. The builder has quick-add chips (Overview, Features, Bonuses & promotions, Payments, Mobile experience, Customer support, Security & licensing, FAQ), move up/down, duplicate, collapse and remove. At most 30 sections, titles up to 120 characters. A section with a title but no text is saved but not shown publicly.
- **Pickers in every editor.** Two new toolbar buttons in the rich editor (everywhere it is used): **Page** links to a page, review, casino, news, research, author, update, sportsbook, affiliate partner or custom item; **Items** adds picked items as links with their picture, or adds a picked picture. Pictures and videos keep their existing buttons.
- **Safer.** Body and sections pass through the shared HTML sanitizer when the page is rendered. The slug is checked (lowercase letters, numbers, dashes) and duplicates get a clear message. An empty body (including only spaces/`&nbsp;`) is refused. Deleting a review now also deletes its sections, so a later review reusing the slug does not inherit them.
- **Editing comforts.** Sticky bar with Save, "Unsaved changes" indicator, Ctrl/Cmd+S, leave-page warning, slug filled from the title on new reviews, item filter, SEO length counters.
- **API.** `generic-review/create` and `/update` accept `sections: [{title, content}]` (omitted on update = unchanged); `generic-review/get` returns `sections`. No migration: sections use the existing `review_blocks` table.

## 12. Review sections of every kind, a sticky section bar, one public address, author hub (v18.5)

- **One public address per review.** Reviews of sportsbooks, affiliate partners and custom content live only at
  `/en/sportsbook/review/…`, `/en/affiliate-partner/review/…` and `/en/custom/{type}/review/…`. `/en/review/{slug}`,
  the `/en/review` list, the public review APIs, the weekly digest and the casino-only lists no longer show them. An old
  `/en/review/{slug}` link to a published generic review answers with a 301 to the real address (an unpublished one is a 404).
  Site search, the page picker and the sitemap use each review's real address.
- **Section types** (dashboard, generic review editor, "+ Add section"): Text (with size, alignment and width), FAQ,
  Images + text (one picture or a 2-4 column gallery, frame, shape, size, text before or after), Payment methods (pick one
  by one, "select all shown", "clear shown", search), Picked items (casinos, reviews, news, research, updates, authors,
  sportsbooks, partners, custom content, pages, as cards, grid, list or compact list, plus pages and links by address),
  Cards & grid (picture, title, text, link, 1-4 columns), Callout (info, tip, warning, good news) and Key figures. Sections
  are stored in `review_blocks` (no migration): plain HTML as before, typed ones as `lmsec:` + JSON, all validated on save
  and escaped or sanitized on the page. FAQ sections also add FAQPage markup.
- **Tables** inside review text and sections scroll sideways inside their own box; pictures and videos never overflow.
- **Sticky section bar** on review pages: Summary, How we scored it, Overview, every section you added, Pros & Cons,
  Verdict. It stays under the site header, highlights the section being read, scrolls itself on phones, jumps smoothly to a
  section, and has a thin reading-progress line. The same bar is used on author pages.
- **Search-and-choose fields.** The item a generic review is about, and the casino slug on the casino review form, are
  found by typing (arrow keys, Enter, Esc); the casino field refuses a slug that is not a real casino.
- **Author page** now shows what the author published, with counts: casino reviews, other reviews, research, news,
  platform updates, sportsbooks/partners/custom listings, comparisons, country and category pages, best-of lists and pages.
  Only content that is live is counted; groups with nothing are left out; each shows the first six, then "Show more".

## 13. Casino reviews get sections and the sticky bar (v18.6)

- The public casino review (`/en/review/slug`) prints every section type and shows the same sticky section bar. The bar lists only
  what is on the page (no dead tabs): Summary, Overview, Games, Bonuses, Payments, Licensing, More details, each section, Verdict,
  Pros & Cons, FAQ. FAQ sections also add FAQPage schema. Old plain blocks keep working (they show as text sections).
- The casino Reviews dashboard has a **Review sections** panel: search and pick a review, build sections with the same builder,
  press Save. `review-blocks/sync` accepts `sections` and checks them; `review-blocks/list` also returns typed `sections`.
- The classic one-block-at-a-time form stays. No migration.

## 14. Landing pages form, author pictures, no empty tabs (v18.7)

- **Landing pages (`/en/best/...`)**: the add and edit forms are now five clear steps (what it is about, items, page sections,
  publishing with author, search preview). Sections use the same builder as reviews (all eight types) and are stored in
  `review_blocks` under the key `landing:<slug>`; no migration. The public page shows an author line, a sticky section bar
  and the sections; FAQ sections add FAQPage schema. `content-landing-page/create|update` accept `sections` and `author_id`;
  `get` returns `sections`. Slugs are checked and duplicates refused. Deleting a page deletes its sections.
- **Author page**: research, platform updates and country pages now show their pictures when they have one.
- **Casino review**: the Pros & Cons tab and block, and every empty row of the Summary table, are left out when nothing was entered.

## 15. Show/hide checkboxes, reviews tabs, author look, clean jumps (v18.8)

- **Show checkbox on every section** (all builders: reviews, generic reviews, landing pages). Off = the section's content and its
  tab in the sticky bar are both left out. Stored as `hidden:true` inside the section.
- **Casino review page parts** (Summary, Overview, Games, Bonuses, Payments, Licensing, More details, Verdict, Pros and cons, FAQ,
  Related casinos) can be switched off per review in the new **Sections & page parts** tab. Stored in the settings table under
  `review_hidden:<slug>`, so no migration. `review-blocks/list` returns `parts` and `hidden_parts`; `review-blocks/sync` accepts `hidden_parts`.
- **Casino Reviews screen** has three tabs (All reviews, Add / edit review, Sections & page parts) and a Sections button on each row.
- **Author page look**: colours of count tiles, sections and cards, corner roundness and shadow are set in Authors > Author page look
  (settings `ah_*`, strict colour values only). Defaults are solid and clearly visible.
- **Count tiles and the top bar** share one jump: a single smooth scroll to the exact heading, corrected while pictures load, no hover wobble.
- Dropdowns and pickers in the admin are solid white with dark text.

### v18.9 note: author-page pictures
News, research and update cards on the author page now try the full picture first and fall back to the thumbnail (before, a missing
thumbnail file made the picture vanish).

## 16. Casino review form: show boxes on every field, tabs that always open the form (v19.0)

- Every field of the casino review form (Overview, Games, Bonuses, Payments, Licensing, Additional content, Verdict, Pros, Cons, FAQ)
  has a **Show on page** checkbox and a **Fold** button; the top of the form has **Show all / Hide all**. Unticked parts disappear
  from the public page and the sticky top bar. Saved straight away when editing, or right after creating a new review.
- The **+ Add / edit review** tab and the **+ Add review** button both open the form panel from any tab, every time
  (before, the tab showed an empty page because the form lives in the slide-in panel).

## 17. Landing pages show their picked and automatic items (v19.1)

An item with no country rules counted as "blocked everywhere", so a landing page (`/en/best/...`) with hand-picked or automatic
items showed none of them. Now only an item that has country rules and is blocked in the visitor's country is left out;
items without rules are shown (without an availability badge). The old test that encoded the previous default was updated.
