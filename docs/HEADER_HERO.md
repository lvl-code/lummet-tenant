# Header & Hero manager

Admin page: **Dashboard → Site Structure → Header & Hero** (`/en/dashboard/header-hero`).
Roles: admin and editor. Nothing goes live until **Save changes**.

## What you can control

- **Announcement bar**: on/off, text, link, tone (info, promo, success, warning), dismissible.
- **Header**: style (standard, solid, glass, transparent), height, sticky, logo mode and size,
  menu alignment, search box and placeholder, login/dashboard/logout labels, optional call-to-action button.
- **Homepage hero**: on/off, background image and focus, colour or gradient, overlay, text theme,
  alignment, height, badge, title, subtitle, description, highlights, two buttons.

A live preview (desktop / phone) uses the real site stylesheets. Quick styles load a starting look.
Links must be a site path (`/en/...`) or `https://`; anything else is refused on screen and again on the server.

## How it works

- Values are stored in the existing `settings` table (keys `site_announce_*`, `site_header_*`, `site_hero_*`,
  plus the shared `theme_header_style` and `theme_header_background`). No migration.
- `en/worker/header-hero.js` holds one declarative field table used for validation, defaults and rendering.
- Markup that is optional is built in JS and inserted with `{{{...}}}` because the template engine cannot nest `{{#if}}`.
- Defaults reproduce the previous header and hero exactly.
- Header element ids used by `search.js` and `app.js` are unchanged.

## Adding a field

Add it to `FIELDS` in `en/worker/header-hero.js`, render it in `headerClasses`/`heroHtml`/`announceHtml`,
add a control to `docs`-generated admin page, and a test in `en/test/header-hero.test.js`.
