# Header & Hero manager

Admin page: **Dashboard → Site Structure → Header & Hero** (`/en/dashboard/header-hero`).
Roles: admin and editor. Nothing goes live until **Save changes**.

## What you can control

- **Announcement bar**: on/off, text, link, tone (info, promo, success, warning), dismissible.
- **Header**: style (standard, solid, glass, transparent), background colour, text colour, font, height, sticky,
  logo mode and size, menu alignment, search box and placeholder, login/dashboard/logout labels, optional call-to-action button.
- **Homepage hero**: on/off, background image and focus, colour or gradient, overlay, text theme,
  alignment, height, badge, title, subtitle, description, highlights, two buttons, custom text colour,
  separate title colour, title font and body font.

A live preview (desktop / phone) uses the real site stylesheets. Quick styles load a starting look.
Links must be a site path (`/en/...`) or `https://`; anything else is refused on screen and again on the server.

## Colours and fonts

- Colour fields take a picker or a typed value: `#rgb`, `#rrggbb`, `rgb()` or `hsl()`. Reset returns to the default.
- Header text colour covers the brand name, menu links, search box and Login/Dashboard/Logout buttons.
  The admin page warns (without blocking) when it is hard to read on the header colour.
- Hero text colour overrides the Light/Dark text choice; the title colour overrides it for the main title only.
- Fonts are system font stacks: Site default, System, Modern sans, Rounded, Serif, Elegant serif, Bold display,
  Monospace. Nothing is downloaded. The stacks live in `FONT_STACKS` in `en/worker/header-hero.js`, and a test
  keeps the admin script in step with it. Only keys from that list are accepted, never typed font names.
- Anything left on Default adds no CSS, so the site looks exactly as before.

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
