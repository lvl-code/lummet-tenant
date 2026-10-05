// ============================================================
// HEADER & HERO SETTINGS
//
// One declarative table (FIELDS) describes every setting the
// "Header & Hero" admin page manages: its key in the `settings`
// table, its type, its allowed values and its default. The same
// table drives
//   - parseHeaderHero()           reading settings for the public site
//   - sanitizeHeaderHeroInput()   cleaning values on save
//   - headerHeroTemplateVars()    the variables the templates use
//
// Nothing here needs a database migration: values live in the
// existing `settings` key/value table, and a missing key falls back
// to the default below, which reproduces the site as it looked
// before this feature existed.
//
// Every value is validated against an allow-list (enums, colors,
// URLs, lengths) and every piece of text is HTML-escaped before it
// reaches a template, because the template engine inserts
// {{variables}} without escaping them.
// ============================================================

const BOOL = "bool";
const ENUM = "enum";
const TEXT = "text";
const LINES = "lines";
const URL_T = "url";
const COLOR = "color";
const INT = "int";

export const HERO_SUBTITLE_DEFAULT =
  "Expert reviews, exclusive bonuses, and real player data for {{casino_count}}+ casinos worldwide.";

// group: where the field belongs on the admin page.
export const FIELDS = [
  // ---------------------------- announcement bar
  { key: "site_announce_enabled", prop: "announceEnabled", group: "announce", type: BOOL, def: false },
  { key: "site_announce_text", prop: "announceText", group: "announce", type: TEXT, max: 160, def: "" },
  { key: "site_announce_link_text", prop: "announceLinkText", group: "announce", type: TEXT, max: 40, def: "" },
  { key: "site_announce_url", prop: "announceUrl", group: "announce", type: URL_T, max: 300, def: "" },
  { key: "site_announce_tone", prop: "announceTone", group: "announce", type: ENUM, values: ["info", "promo", "success", "warning"], def: "info" },
  { key: "site_announce_dismissible", prop: "announceDismissible", group: "announce", type: BOOL, def: true },

  // ---------------------------- header
  { key: "theme_header_style", prop: "headerStyle", group: "header", type: ENUM, values: ["default", "solid", "glass", "transparent"], def: "default" },
  { key: "theme_header_background", prop: "headerBackground", group: "header", type: COLOR, def: "" },
  { key: "site_header_sticky", prop: "headerSticky", group: "header", type: BOOL, def: true },
  { key: "site_header_height", prop: "headerHeight", group: "header", type: ENUM, values: ["compact", "default", "tall"], def: "default" },
  { key: "site_header_logo_mode", prop: "logoMode", group: "header", type: ENUM, values: ["both", "logo", "text"], def: "both" },
  { key: "site_header_logo_size", prop: "logoSize", group: "header", type: ENUM, values: ["sm", "md", "lg"], def: "md" },
  { key: "site_header_nav_align", prop: "navAlign", group: "header", type: ENUM, values: ["left", "center", "right"], def: "left" },
  { key: "site_header_show_search", prop: "showSearch", group: "header", type: BOOL, def: true },
  { key: "site_header_search_placeholder", prop: "searchPlaceholder", group: "header", type: TEXT, max: 60, def: "Search casinos..." },
  { key: "site_header_show_auth", prop: "showAuth", group: "header", type: BOOL, def: true },
  { key: "site_header_login_label", prop: "loginLabel", group: "header", type: TEXT, max: 24, def: "Login" },
  { key: "site_header_dashboard_label", prop: "dashboardLabel", group: "header", type: TEXT, max: 24, def: "Dashboard", fallbackWhenEmpty: true },
  { key: "site_header_logout_label", prop: "logoutLabel", group: "header", type: TEXT, max: 24, def: "Logout", fallbackWhenEmpty: true },
  { key: "site_header_cta_enabled", prop: "ctaEnabled", group: "header", type: BOOL, def: false },
  { key: "site_header_cta_text", prop: "ctaText", group: "header", type: TEXT, max: 30, def: "" },
  { key: "site_header_cta_url", prop: "ctaUrl", group: "header", type: URL_T, max: 300, def: "" },
  { key: "site_header_cta_style", prop: "ctaStyle", group: "header", type: ENUM, values: ["primary", "outline"], def: "primary" },
  { key: "site_header_cta_new_tab", prop: "ctaNewTab", group: "header", type: BOOL, def: false },

  // ---------------------------- hero
  { key: "site_hero_enabled", prop: "heroEnabled", group: "hero", type: BOOL, def: true },
  { key: "site_hero_image", prop: "heroImage", group: "hero", type: URL_T, max: 500, def: "", absoluteOnly: true },
  { key: "site_hero_image_focus", prop: "heroImageFocus", group: "hero", type: ENUM, values: ["center", "top", "bottom"], def: "center" },
  { key: "site_hero_badge_enabled", prop: "heroBadgeEnabled", group: "hero", type: BOOL, def: true },
  { key: "site_hero_badge", prop: "heroBadge", group: "hero", type: TEXT, max: 80, def: "Find Your Perfect Casino", fallbackWhenEmpty: true },
  { key: "site_hero_title", prop: "heroTitle", group: "hero", type: TEXT, max: 140, def: "Find Your Perfect Casino", fallbackWhenEmpty: true },
  { key: "site_hero_subtitle", prop: "heroSubtitle", group: "hero", type: TEXT, max: 320, def: HERO_SUBTITLE_DEFAULT, fallbackWhenEmpty: true },
  { key: "site_hero_description", prop: "heroDescription", group: "hero", type: TEXT, max: 600, def: "" },
  { key: "site_hero_highlights", prop: "heroHighlights", group: "hero", type: LINES, max: 60, maxLines: 4, def: "" },
  { key: "site_hero_button_enabled", prop: "heroButtonEnabled", group: "hero", type: BOOL, def: true },
  { key: "site_hero_button_text", prop: "heroButtonText", group: "hero", type: TEXT, max: 40, def: "Browse Casinos", fallbackWhenEmpty: true },
  { key: "site_hero_button_url", prop: "heroButtonUrl", group: "hero", type: URL_T, max: 300, def: "/en/casino", fallbackWhenEmpty: true },
  { key: "site_hero_button2_text", prop: "heroButton2Text", group: "hero", type: TEXT, max: 40, def: "" },
  { key: "site_hero_button2_url", prop: "heroButton2Url", group: "hero", type: URL_T, max: 300, def: "" },
  { key: "site_hero_alignment", prop: "heroAlignment", group: "hero", type: ENUM, values: ["left", "center", "right"], def: "center" },
  { key: "site_hero_height", prop: "heroHeight", group: "hero", type: ENUM, values: ["compact", "standard", "tall", "screen"], def: "standard" },
  { key: "site_hero_bg_mode", prop: "heroBgMode", group: "hero", type: ENUM, values: ["default", "brand", "solid"], def: "default" },
  { key: "site_hero_bg_color", prop: "heroBgColor", group: "hero", type: COLOR, def: "" },
  { key: "site_hero_overlay", prop: "heroOverlay", group: "hero", type: BOOL, def: true },
  { key: "site_hero_overlay_opacity", prop: "heroOverlayOpacity", group: "hero", type: INT, min: 0, max: 85, def: 45 },
  { key: "site_hero_text_theme", prop: "heroTextTheme", group: "hero", type: ENUM, values: ["light", "dark"], def: "light" }
];

export const HEADER_HERO_KEYS = FIELDS.map((f) => f.key);

const BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));

// ------------------------------------------------------------
// Validators
// ------------------------------------------------------------

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanText(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s*[\r\n]+\s*/g, " ")
    .trim()
    .slice(0, max);
}

function cleanLines(value, max, maxLines) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => cleanText(line, max))
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");
}

// Allows an on-site path, an anchor, or an http(s)/mailto/tel link.
// Anything else (javascript:, data:, //host, ...) becomes "".
export function cleanLink(value, max = 300) {
  const v = String(value ?? "").trim().slice(0, max);
  if (!v) return "";
  if (/[\u0000-\u001f\u007f\s"'<>\\]/.test(v)) return "";
  if (/^\/(?!\/)/.test(v)) return v;
  if (/^#[\w-]*$/.test(v)) return v;
  if (/^https?:\/\/[^\s/]+/i.test(v)) return v;
  if (/^mailto:[^\s]+$/i.test(v)) return v;
  if (/^tel:[+\d][\d\s().-]*$/i.test(v)) return v;
  return "";
}

// A background image must be an absolute http(s) URL or an on-site path.
function cleanImage(value, max) {
  const v = cleanLink(value, max);
  if (!v) return "";
  if (/^(mailto|tel):/i.test(v) || v.startsWith("#")) return "";
  return v;
}

export function cleanColor(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\(\s*[\d\s.,%/-]+\)$/i.test(v)) return v;
  return "";
}

function toBool(value, def) {
  if (value === true || value === "true" || value === "1" || value === "on") return true;
  if (value === false || value === "false" || value === "0" || value === "off") return false;
  return def;
}

function normalizeOne(field, raw) {
  const present = raw !== undefined && raw !== null;
  // A setting that was never saved uses its default; one saved as empty stays empty
  // (except where a blank means "use the default", marked fallbackWhenEmpty).
  if (!present && (field.type === TEXT || field.type === LINES || field.type === URL_T)) return field.def;
  switch (field.type) {
    case BOOL:
      return toBool(raw, field.def);
    case ENUM: {
      const v = String(raw ?? "").trim();
      return field.values.includes(v) ? v : field.def;
    }
    case INT: {
      const n = Math.round(Number(raw));
      if (!present || raw === "" || !Number.isFinite(n)) return field.def;
      return Math.min(field.max, Math.max(field.min, n));
    }
    case COLOR:
      return cleanColor(raw);
    case URL_T: {
      const v = field.absoluteOnly ? cleanImage(raw, field.max) : cleanLink(raw, field.max);
      return v || (field.fallbackWhenEmpty ? field.def : "");
    }
    case LINES:
      return cleanLines(raw, field.max, field.maxLines);
    case TEXT:
    default: {
      const v = cleanText(raw, field.max);
      return v || (field.fallbackWhenEmpty ? field.def : "");
    }
  }
}

// ------------------------------------------------------------
// Reading settings (public site)
// ------------------------------------------------------------

/** @param {Record<string,string>} values rows of the settings table */
export function parseHeaderHero(values = {}) {
  const out = {};
  for (const field of FIELDS) {
    out[field.prop] = normalizeOne(field, values ? values[field.key] : undefined);
  }
  return out;
}

export function defaultHeaderHero() {
  return parseHeaderHero({});
}

// ------------------------------------------------------------
// Cleaning values on save
// ------------------------------------------------------------

/**
 * Returns a copy of `body` in which every header/hero key holds a valid,
 * string value. Keys that are not part of this feature pass through
 * untouched. Invalid values are replaced by the default instead of
 * being rejected, so a stray value can never break the public site.
 */
export function sanitizeHeaderHeroInput(body = {}) {
  const out = { ...body };
  for (const key of Object.keys(body)) {
    const field = BY_KEY.get(key);
    if (!field) continue;
    const value = normalizeOne(field, body[key]);
    out[key] = typeof value === "boolean" ? String(value) : String(value);
  }
  return out;
}

// ------------------------------------------------------------
// Template variables
// ------------------------------------------------------------

const HEADER_HEIGHT_PX = { compact: 56, default: 68, tall: 84 };
const LOGO_SIZE_PX = { sm: 32, md: 40, lg: 52 };

function cssUrl(value) {
  return String(value).replace(/['"()\\\s]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
}

function hashText(text) {
  let h = 5381;
  const s = String(text);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Classes that describe the header on <body> (and on the admin preview). */
export function headerClasses(hh) {
  return [
    hh.headerSticky ? "hh-sticky" : "hh-static",
    `hh-height-${hh.headerHeight}`,
    `hh-style-${hh.headerStyle}`,
    `hh-logo-${hh.logoMode}`,
    `hh-logo-size-${hh.logoSize}`,
    `hh-nav-${hh.navAlign}`
  ].join(" ");
}

export function heroClasses(hh, hasImage) {
  return [
    `hero--h-${hh.heroHeight}`,
    `hero--text-${hh.heroTextTheme}`,
    `hero--focus-${hh.heroImageFocus}`,
    hasImage ? "hero--image" : `hero--bg-${hh.heroBgMode}`
  ].join(" ");
}

function announceHtml(hh, showLink) {
  const id = hashText(`${hh.announceText}|${hh.announceUrl}|${hh.announceTone}`);
  const link = showLink
    ? ` <a class="hh-announce__link" href="${escapeHtml(hh.announceUrl)}">${escapeHtml(hh.announceLinkText)}</a>`
    : "";
  const close = hh.announceDismissible
    ? '<button type="button" class="hh-announce__close" data-announce-close aria-label="Dismiss announcement">&times;</button>'
    : "";
  return (
    `<div class="hh-announce hh-announce--${hh.announceTone}" role="region" aria-label="Announcement" data-announce-id="${id}">` +
    `<div class="container hh-announce__inner"><p class="hh-announce__text">${escapeHtml(hh.announceText)}${link}</p>${close}</div></div>`
  );
}

function heroHtml(hh, hasImage) {
  const e = escapeHtml;
  const style = hasImage ? ` style="background-image:url('${cssUrl(hh.heroImage)}')"` : "";
  const overlay = hh.heroOverlay && hh.heroOverlayOpacity > 0 ? '<div class="hero-overlay" aria-hidden="true"></div>' : "";
  const badge = hh.heroBadgeEnabled && hh.heroBadge ? `<div class="hero-badge">${e(hh.heroBadge)}</div>` : "";
  const description = hh.heroDescription ? `<p class="hero-description">${e(hh.heroDescription)}</p>` : "";
  const highlights = hh.heroHighlights
    ? `<ul class="hero-highlights">${hh.heroHighlights.split("\n").map((t) => `<li>${e(t)}</li>`).join("")}</ul>`
    : "";
  const primary =
    hh.heroButtonEnabled && hh.heroButtonText && hh.heroButtonUrl
      ? `<a href="${e(hh.heroButtonUrl)}" class="btn btn--primary btn--lg">${e(hh.heroButtonText)}</a>`
      : "";
  const secondary =
    hh.heroButton2Text && hh.heroButton2Url
      ? `<a href="${e(hh.heroButton2Url)}" class="btn btn--ghost btn--lg">${e(hh.heroButton2Text)}</a>`
      : "";
  const actions = primary || secondary ? `<div class="hero-actions">${primary}${secondary}</div>` : "";
  return (
    `<section class="hero ${heroClasses(hh, hasImage)}" id="siteHero"${style}>${overlay}` +
    `<div class="container"><div class="hero-content hero-content--${hh.heroAlignment}">` +
    `${badge}<h1>${e(hh.heroTitle)}</h1><p class="hero-subtitle">${e(hh.heroSubtitle)}</p>${description}${highlights}${actions}` +
    `</div></div></section>`
  );
}

export function headerHeroTemplateVars(hh = defaultHeaderHero()) {
  hh = { ...defaultHeaderHero(), ...(hh || {}) };

  // ---- CSS variables, emitted only when they differ from the defaults
  const vars = [`--hh-header-h:${HEADER_HEIGHT_PX[hh.headerHeight]}px`, `--hh-logo:${LOGO_SIZE_PX[hh.logoSize]}px`];
  if (hh.headerBackground) vars.push(`--hh-header-bg:${hh.headerBackground}`);
  vars.push(`--hh-hero-overlay:${(hh.heroOverlayOpacity / 100).toFixed(2)}`);
  if (hh.heroBgColor) vars.push(`--hh-hero-bg:${hh.heroBgColor}`);

  const hasImage = Boolean(hh.heroImage);
  const showCta = hh.ctaEnabled && hh.ctaText && hh.ctaUrl;
  const showAnnounce = hh.announceEnabled && hh.announceText;
  const showLink = Boolean(hh.announceLinkText && hh.announceUrl);

  return {
    hh_css: `<style id="hh-vars">:root{${vars.join(";")}}</style>`,
    hh_body_class: headerClasses(hh),

    // header
    hh_logo_img: hh.logoMode !== "text",
    hh_logo_text: hh.logoMode !== "logo",
    hh_show_search: hh.showSearch,
    hh_search_placeholder: escapeHtml(hh.searchPlaceholder),
    hh_show_auth: hh.showAuth,
    hh_login_label: escapeHtml(hh.loginLabel || "Login"),
    hh_dashboard_label: escapeHtml(hh.dashboardLabel),
    hh_logout_label: escapeHtml(hh.logoutLabel),
    hh_cta: Boolean(showCta),
    hh_cta_text: escapeHtml(hh.ctaText),
    hh_cta_url: escapeHtml(hh.ctaUrl),
    hh_cta_class: hh.ctaStyle === "outline" ? "btn--outline" : "btn--primary",
    hh_cta_target: hh.ctaNewTab ? ' target="_blank" rel="noopener"' : "",

    // announcement bar (built here because it has optional parts)
    hh_announce: Boolean(showAnnounce),
    hh_announce_html: showAnnounce ? announceHtml(hh, showLink) : "",

    // hero (built here because most of its parts are optional)
    hh_hero: hh.heroEnabled,
    hh_hero_html: hh.heroEnabled ? heroHtml(hh, hasImage) : ""
  };
}

/** Defaults as strings keyed by setting key, for the admin page. */
export function headerHeroDefaultsForAdmin() {
  const out = {};
  for (const f of FIELDS) out[f.key] = String(f.def);
  return out;
}

/**
 * JSON that is safe inside <script type="application/json">: angle brackets,
 * ampersands and curly braces are written as \u escapes (the page template engine
 * would otherwise treat a "{{name}}" token in a default as a variable).
 */
export function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\{\{/g, "{\\u007b")
    .replace(/\}\}/g, "\\u007d}")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
